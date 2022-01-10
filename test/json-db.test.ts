import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import 'mocha';
import * as should from 'should';

import { JsonDB, getEmptyFileContents, RecordId, Adapters } from '../src/json-db/json-db';

async function promiseShouldThrow(cb: () => void | Promise<void>, msg?: string) {
    try {
        await cb();

        should.throws(() => {
            // empty here
        }, msg);
    }
    catch (err: unknown) {
        if (msg) {
            if (err instanceof Error) {
                should.equal(err.message, msg);
            }
            else {
                throw new Error(`Error message required: ${msg}`);
            }
        }
    }
}

interface DbRes {
    users: {
        id: RecordId;
        createdAt: string;
        updatedAt: string;
        email: string;
    };
    projects: {
        id: RecordId;
        createdAt: string;
        updatedAt: string;
        name: string;
        tagsIds: RecordId[];
    };
    tags: {
        id: RecordId;
        createdAt: string;
        updatedAt: string;
        name: string;
        parentId: RecordId | null;
    };
}

function getEmptyDbContentRaw() {
    const data = getEmptyFileContents(['users', 'projects', 'tags']);

    return JSON.stringify(data);
}

// interface DbBody {
//     users: {
//         email: string;
//     };
//     projects: {
//         name: string;
//     };
//     tags: {
//         name: string;
//         parentId?: RecordId | null;
//     },
// }

const DB_FILE_PATH = path.resolve(process.cwd(), 'json-db-test.json');

function createDbFile() {
    const dataStr = getEmptyDbContentRaw();
    fs.writeFileSync(DB_FILE_PATH, dataStr);

    return new JsonDB<DbRes>({
        adapter: new Adapters.File({
            filePath: DB_FILE_PATH,
        }),
        // findById: (coll, rec, id) => {
        //     // rec.
        // },
    });
}

const jsonDB = createDbFile();

describe('JsonDB', () => {
    beforeEach(async () => {
        await jsonDB.clear();
    });

    after(async () => {
        // remove file

        await fs.promises.unlink(DB_FILE_PATH);
    });

    describe('getEmptyFileContents', () => {
        it('returns correct file contents', () => {
            const act = getEmptyFileContents(['users', 'projects', 'tags']);
            const exp = {
                counters: {users: 0, projects: 0, tags: 0},
                collections: {users: [], projects: [], tags: []},
            };

            should.deepEqual(act, exp);
        });
    });

    describe('schema/structure validation', () => {
        // it('throws when file contains invalid structure', () => {
        //     const data = getEmptyFileContents(['users', 'projects', 'tags']);
        //     fs.writeFileSync(DB_FILE_PATH, '');

        //     new JsonDB<DbRes>({
        //         filePath: DB_FILE_PATH,
        //         // findById: (coll, rec, id) => {
        //         //     // rec.
        //         // },
        //     });
        // });

        // it('throws when any record has invalid schema');

        it('invokes beforeInsert hook');

        it('invokes beforeUpdate hook');

        it('invokes beforeDelete hook', async () => {
            // jsonDB.validate.onInsert((collName, body) => {
            //     if (collName === 'projects') {
            //         body.name.length > 30;
            //     }
            // });

            // jsonDB.validate.onUpdate('tags', (id, body) => {
            //     // body.
            // });

            // jsonDB.validate.onDelete('tags', id => {
            //
            // });

            // jsonDB.hooks.beforeUpdate(body => {
            //     // removes records that reference deleted record
            // });

            // after record found, before actual deletion
            const memAdapter = new Adapters.Memory({
                db: getEmptyDbContentRaw(),
            });
            const jsonDB = new JsonDB<DbRes>({
                adapter: memAdapter,
                hooks: {
                    tags: {
                        beforeDelete: async id => {
                            // removes records that reference deleted record

                            const { projects, tags } = await jsonDB.read()
                            const tagChildren = tags.filter(t => t.parentId === id);

                            if (tagChildren.length > 0) {
                                const err = new Error('cannot delete tag that has children');
                                // err.tagsIds = tagChildren.map(t => t.id);
                                throw err;
                            }

                            const tagProjects = projects.filter(p => p.tagsIds.includes(id));

                            if (tagProjects.length > 0) {
                                const err = new Error('cannot delete tag that is assigned to a project');
                                // err.projectsIds = tagProjects.map(p => p.id);
                                throw err;
                            }
                        }
                    }
                },
            });

            const res_t1 = await jsonDB.insert('tags', {name: 't1', parentId: null});
            const res_t2 = await jsonDB.insert('tags', { name: 't1.1', parentId: res_t1.id });

            await promiseShouldThrow(async () => {
                await jsonDB.delete('tags', 1);
            }, 'cannot delete tag that has children');

            await jsonDB.delete('tags', res_t2.id);
            await jsonDB.insert('projects', {name: 'p1', tagsIds: [res_t1.id]});

            await promiseShouldThrow(async () => {
                await jsonDB.delete('tags', 1);
            }, 'cannot delete tag that is assigned to a project');
        });

        it('invokes afterInsert hook');

        it('invokes afterUpdate hook');

        it('invokes afterDelete hook');
    });

    it('loads content', async () => {
        const dataBefore = await jsonDB.read();

        should.deepEqual(Object.keys(dataBefore), ['users', 'projects', 'tags']);
        should.equal(dataBefore.users.length, 0);
        should.equal(dataBefore.projects.length, 0);
        should.equal(dataBefore.tags.length, 0);

        await jsonDB.insert('users', {email: 'aaa@bbb.com'});
        await jsonDB.insert('projects', {name: 'p1', tagsIds: []});
        await jsonDB.insert('tags', {name: '', parentId: null});

        const dataAfter = await jsonDB.read();

        should.deepEqual(Object.keys(dataBefore), ['users', 'projects', 'tags']);
        should.equal(dataAfter.users.length, 1);
        should.equal(dataAfter.projects.length, 1);
        should.equal(dataAfter.tags.length, 1);
    });

    describe('modification', () => {
        let memAdapter: Adapters.Memory;
        let jsonDB: JsonDB<DbRes>;
        const ops: string[] = [];

        beforeEach(() => {
            memAdapter = new Adapters.Memory({
                db: getEmptyDbContentRaw(),
            });
            jsonDB = new JsonDB<DbRes>({
                adapter: memAdapter,
                hooks: {
                    projects: {
                        beforeInsert: body => {
                            ops.push(`${body.name} beforeInsert`);
                        },
                        beforeUpdate: (id, body) => {
                            ops.push(`${body.name} beforeUpdate`);
                        },
                        beforeDelete: id => {
                            ops.push(`#${id} beforeDelete`);
                        },
                        afterInsert: record => {
                            ops.push(`${record.name} afterInsert`);
                        },
                        afterUpdate: record => {
                            ops.push(`${record.name} afterUpdate`);
                        },
                        afterDelete: record => {
                            ops.push(`${record.name} afterDelete`);
                        },
                    },
                },
            });
        });

        afterEach(() => {
            ops.length = 0;
        });

        it('insert actions wait for other modify actions to finish', async () => {
            await Promise.all([
                new Promise(async res => {
                    memAdapter.delay = 50;
                    await jsonDB.insert('projects', {name: 'p1', tagsIds: []});
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 25;
                    await jsonDB.insert('projects', {name: 'p2', tagsIds: []});
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 0;
                    await jsonDB.insert('projects', {name: 'p3', tagsIds: []});
                    res(null);
                }),
            ]);

            const data = await jsonDB.read();

            should.deepEqual(data.projects.map(p => p.name), ['p1', 'p2', 'p3']);
            should.deepEqual(ops, [
                'p1 beforeInsert', 'p1 afterInsert',
                'p2 beforeInsert', 'p2 afterInsert',
                'p3 beforeInsert', 'p3 afterInsert'
            ]);
        });

        it('update actions wait for other modify actions to finish', async () => {
            const project = await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });

            await Promise.all([
                new Promise(async res => {
                    memAdapter.delay = 50;
                    await jsonDB.update('projects', project.id, {name: 'p1 update1', tagsIds: []});
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 25;
                    await jsonDB.update('projects', project.id, {name: 'p1 update2', tagsIds: []});
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 0;
                    await jsonDB.update('projects', project.id, {name: 'p1 update3', tagsIds: []});
                    res(null);
                }),
            ]);

            const data = await jsonDB.read();

            should.equal(data.projects[0].name, 'p1 update3');
            should.deepEqual(ops, [
                'p1 beforeInsert', 'p1 afterInsert',
                // *** //
                'p1 update1 beforeUpdate', 'p1 update1 afterUpdate',
                'p1 update2 beforeUpdate', 'p1 update2 afterUpdate',
                'p1 update3 beforeUpdate', 'p1 update3 afterUpdate'
            ]);
        });

        it('delete actions wait for other modify actions to finish', async () => {
            const p1 = await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });
            const p2 = await jsonDB.insert('projects', { name: 'p2', tagsIds: [] });
            const p3 = await jsonDB.insert('projects', { name: 'p3', tagsIds: [] });

            await Promise.all([
                new Promise(async res => {
                    memAdapter.delay = 50;
                    await jsonDB.delete('projects', p1.id);
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 25;
                    await jsonDB.delete('projects', p2.id);
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 0;
                    await jsonDB.delete('projects', p3.id);
                    res(null);
                }),
            ]);

            const data = await jsonDB.read();

            should.equal(data.projects.length, 0);
            should.deepEqual(ops, [
                'p1 beforeInsert', 'p1 afterInsert',
                'p2 beforeInsert', 'p2 afterInsert',
                'p3 beforeInsert', 'p3 afterInsert',
                // *** //
                '#1 beforeDelete', 'p1 afterDelete',
                '#2 beforeDelete', 'p2 afterDelete',
                '#3 beforeDelete', 'p3 afterDelete'
            ]);
        });

        it('transactions wait for other modify actions to finish', async () => {
            let p1: DbRes['projects'];
            let p2: DbRes['projects'];
            let p3: DbRes['projects'];

            await Promise.all([
                new Promise(async res => {
                    memAdapter.delay = 50;
                    await jsonDB.transaction(async tx => {
                        p1 = await tx.insert('projects', { name: 'p1', tagsIds: [] });
                        await tx.update('projects', p1.id, { name: 'p1 update1', tagsIds: [] });
                    });
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 25;
                    await jsonDB.transaction(async tx => {
                        p2 = await tx.insert('projects', { name: 'p2', tagsIds: [] });
                        p3 = await tx.insert('projects', { name: 'p3', tagsIds: [] });
                        await tx.delete('projects', p1.id);
                    });
                    res(null);
                }),
                new Promise(async res => {
                    memAdapter.delay = 0;
                    await jsonDB.transaction(async tx => {
                        await tx.update('projects', p2.id, { name: 'p2 update1' });
                        await tx.update('projects', p3.id, { name: 'p3 update1' });
                    });
                    res(null);
                }),
            ]);

            const data = await jsonDB.read();

            should.equal(data.projects.length, 2);
            should.deepEqual(ops, [
                'p1 beforeInsert', 'p1 afterInsert',
                'p1 update1 beforeUpdate', 'p1 update1 afterUpdate',
                // *** //
                'p2 beforeInsert', 'p2 afterInsert',
                'p3 beforeInsert', 'p3 afterInsert',
                '#1 beforeDelete', 'p1 update1 afterDelete',
                // *** //
                'p2 update1 beforeUpdate', 'p2 update1 afterUpdate',
                'p3 update1 beforeUpdate', 'p3 update1 afterUpdate',
            ]);
        });

        it('various modify actions execute one at a time', async () => {
            await Promise.all([
                jsonDB.insert('projects', { name: 'p1', tagsIds: [] }),
                jsonDB.update('projects', 1, { name: 'p1 update1', tagsIds: [] }),
                jsonDB.insert('projects', { name: 'p2', tagsIds: [] }),
                jsonDB.insert('projects', { name: 'p3', tagsIds: [] }),
                jsonDB.delete('projects', 1),
                jsonDB.update('projects', 2, { name: 'p2 update1' }),
                jsonDB.update('projects', 3, { name: 'p3 update1' }),
            ]);

            const data = await jsonDB.read();

            should.equal(data.projects.length, 2);
            should.deepEqual(ops, [
                'p1 beforeInsert', 'p1 afterInsert',
                'p1 update1 beforeUpdate', 'p1 update1 afterUpdate',
                // *** //
                'p2 beforeInsert', 'p2 afterInsert',
                'p3 beforeInsert', 'p3 afterInsert',
                '#1 beforeDelete', 'p1 update1 afterDelete',
                // *** //
                'p2 update1 beforeUpdate', 'p2 update1 afterUpdate',
                'p3 update1 beforeUpdate', 'p3 update1 afterUpdate',
            ]);
        });
    });

    describe('creating record', () => {
        // it('throws when payload contains id field', () => {
        //     await promiseShouldThrow(() => {
        //         await jsonDB.insert('projects', { id: 123, name: 'test 1' });
        //     });
        // });

        // it('throws when payload contains timestamp fields', () => {
        //     await promiseShouldThrow(() => {
        //         await jsonDB.insert('projects', { createdAt: '', name: 'test 1' });
        //         await jsonDB.insert('projects', { updatedAt: '', name: 'test 1' });
        //     });
        // });

        it('throws when references id of non-existent record', async () => {
            await promiseShouldThrow(async () => {
                await jsonDB.insert('tags', {name: 't1', parentId: 123});
            });
        });

        it('adds new record to db', async () => {
            const data1 = await jsonDB.read();
            should.equal(data1.projects.length, 0);

            await jsonDB.insert('projects', { name: 'test 1', tagsIds: [] });

            const data2 = await jsonDB.read();
            should.equal(data2.projects.length, 1);

            const project = data2.projects[0];
            should.exist(project);

            should.equal(project.id, 1);
            should.equal(project.name, 'test 1');
        });

        it('adds timestamps', async () => {
            await jsonDB.insert('projects', { name: 'test 1', tagsIds: [] });

            const data = await jsonDB.read();
            const p1 = data.projects[0];

            should.equal(typeof p1.createdAt, 'string');
            should.equal(typeof p1.updatedAt, 'string');
        });

        it('returns newly created record', async () => {
            const project = await jsonDB.insert('projects', { name: 'test 1', tagsIds: [] });

            should.deepEqual(Object.keys(project), ['id', 'createdAt', 'updatedAt', 'name', 'tagsIds']);
            should.equal(project.id, 1);
            should.equal(project.name, 'test 1');
        });

        it('increases ID counter', async () => {
            const p1 = await jsonDB.insert('projects', { name: 'test 1', tagsIds: [] });
            const p2 = await jsonDB.insert('projects', { name: 'test 2', tagsIds: [] });
            const t1 = await jsonDB.insert('tags', { name: 'tag 1', parentId: null });

            should.equal(p1.id, 1);
            should.equal(p2.id, 2);
            should.equal(t1.id, 1);
        });

        // it('ignores undefineds in body', () => {
        //     await jsonDB.insert('tags', { name: 'test 1 });
        // });

        // it('ignores undefineds in body', () => {
        //     await promiseShouldThrow(() => {
        //         // use "any" to force undefined
        //         await jsonDB.insert('projects', { name: undefined as any, tagsIds: [] });
        //     });
        // });
    });

    describe('updating record', () => {
        it('throws when id not found', async () => {
            await promiseShouldThrow(async () => {
                await jsonDB.update('projects', 1, {});
            });
        });

        it('throws when references id of non-existent record', async () => {
            await promiseShouldThrow(async () => {
                // jsonDB.update('projects', 1, {});
                await jsonDB.insert('tags', { name: 't1', parentId: null });
                await jsonDB.update('tags', 1, {parentId: 123});
            });
        });

        // it('throws when payload contains id field', () => {

        // });

        // it('throws when payload contains timestamp fields', () => {

        // });

        it('updates record in db', async () => {
            await jsonDB.insert('projects', {name: 'p1', tagsIds: []});
            await jsonDB.update('projects', 1, {name: 'p1 updated'});

            const data = await jsonDB.read();

            should.equal(data.projects.length, 1);
            should.equal(data.projects[0].name, 'p1 updated');
        });

        it('returns updated record', async () => {
            await jsonDB.insert('projects', {name: 'p1', tagsIds: []});
            const p1 = await jsonDB.update('projects', 1, {name: 'p1 updated'});

            should.deepEqual(Object.keys(p1), ['id', 'createdAt', 'updatedAt', 'name', 'tagsIds']);
            should.equal(p1.id, 1);
            should.equal(typeof p1.createdAt, 'string');
            should.equal(typeof p1.updatedAt, 'string');
            should.equal(p1.name, 'p1 updated');
        });

        it('does not change fields not present in body', async () => {
            await jsonDB.insert('tags', { name: 'tag 1', parentId: null });
            await jsonDB.insert('tags', { name: 'tag 2', parentId: 1 });

            const tagRes1 = await jsonDB.update('tags', 2, {name: 'tag 2 updated'});

            should.equal(tagRes1.name, 'tag 2 updated');
            should.equal(tagRes1.parentId, 1);

            const tagRes2 = await jsonDB.update('tags', 2, {parentId: null});

            should.equal(tagRes2.name, 'tag 2 updated');
            should.equal(tagRes2.parentId, null);

        });

        it('updates timestamp', async () => {
            const res1 = await jsonDB.insert('tags', { name: 'tag', parentId: null });

            return new Promise((res) => {
                setTimeout(async () => {
                    const res2 = await jsonDB.update('tags', 1, { name: 'tag updated' });

                    should.equal(res1.createdAt === res2.createdAt, true);
                    should.equal(res1.updatedAt === res2.updatedAt, false);

                    res();
                }, 10);
            });
        });

        it('ignores undefineds in body', async () => {
            await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });

            await promiseShouldThrow(async () => {
                await jsonDB.update('projects', 1, {name: undefined});
            });
        });
    });

    describe('deleting record', async () => {
        it('throws when id not found', async () => {
            await promiseShouldThrow(async () => {
                await jsonDB.delete('projects', 1);
            });
        });

        // it('throws when deleting record that is referenced elsewhere', () => {
        //     await promiseShouldThrow(() => {
        //         // jsonDB.update('projects', 1, {});
        //         await jsonDB.insert('tags', { name: 't1', parentId: null });
        //         await jsonDB.insert('tags', { name: 't2', parentId: 1 });
        //         await jsonDB.delete('tags', 1);
        //     });
        // });

        it('removes record from db', async () => {
            await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });
            await jsonDB.delete('projects', 1);

            const data = await jsonDB.read();

            should.equal(data.projects.length, 0);
        });

        it('returns deleted record', async () => {
            await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });
            const project = await jsonDB.delete('projects', 1);

            should.deepEqual(Object.keys(project), ['id', 'createdAt', 'updatedAt', 'name', 'tagsIds']);
            should.equal(project.id, 1);
            should.equal(typeof project.createdAt, 'string');
            should.equal(typeof project.updatedAt, 'string');
            should.equal(project.name, 'p1');
        });
    });

    describe('clearing data', () => {
        it('deletes all records from all collections', async () => {
            await jsonDB.insert('users', { email: 'u1' });
            await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });
            await jsonDB.insert('tags', { name: 't1', parentId: null });

            await jsonDB.clear();

            const data = await jsonDB.read();

            should.equal(data.users.length, 0);
            should.equal(data.projects.length, 0);
            should.equal(data.tags.length, 0);
        });
    });

    // describe('batch', () => {
    //     it('executes in sequence', async () => {
    //         await jsonDB.insert('projects', {name: 'p1', tagsIds: []});
    //         await jsonDB.insert('projects', {name: 'p2', tagsIds: []});
    //         await jsonDB.insert('projects', {name: 'p3', tagsIds: []});

    //         const batchRes = await jsonDB.batch([
    //             {
    //                 type: 'insert',
    //                 collection: 'projects',
    //                 body: {name: 'p4'},
    //             },
    //             {
    //                 type: 'insert',
    //                 collection: 'tags',
    //                 body: {name: 'p4'},
    //             },
    //             {
    //                 type: 'update',
    //                 collection: 'projects',
    //                 id: 1,
    //                 body: {name: 'p1 updated'}
    //             },
    //             {
    //                 type: 'update',
    //                 collection: 'projects',
    //                 id: 2,
    //                 body: {name: 'p2 updated'}
    //             },
    //             {
    //                 type: 'delete',
    //                 collection: 'projects',
    //                 id: 3,
    //             },
    //         ]);

    //         should.equal(batchRes.length, 5);

    //         const data = await jsonDB.read();

    //         should.equal(data.projects.length, 3);
    //         should.equal(data.projects[0].name, 'p1 updated');
    //         should.equal(data.projects[1].name, 'p2 updated');
    //         should.equal(data.projects[2].id, 4);
    //         should.equal(data.projects[2].name, 'p4');
    //     });

    //     it('returns array of results');

    //     it('reverts all operations if an error occurred in any of them');
    // });

    describe('transactions', () => {
        describe('commit', () => {
            it('saves all insert, update and delete actions', async () => {
                await jsonDB.transaction(async tx => {
                    await tx.insert('projects', {name: 'p1', tagsIds: []});
                    await tx.insert('projects', {name: 'p2', tagsIds: []});

                    await tx.update('projects', 2, {
                        name: 'p2 updated'
                    });

                    await tx.delete('projects', 1);
                });

                const data = await jsonDB.read();

                should.equal(data.projects.length, 1);
                should.equal(data.projects[0].id, 2);
                should.equal(data.projects[0].name, 'p2 updated');
            });

            it('changes db within transaction context', async () => {
                await jsonDB.insert('projects', { name: 'p0', tagsIds: [] });

                await jsonDB.transaction(async tx => {
                    await tx.insert('projects', {name: 'p1', tagsIds: []});
                    await tx.insert('projects', {name: 'p2', tagsIds: []});

                    await tx.update('projects', 3, {
                        name: 'p2 updated'
                    });

                    await tx.delete('projects', 1);

                    const data = await tx.read();

                    should.equal(data.projects.length, 2);
                    should.equal(data.projects[1].id, 3);
                    should.equal(data.projects[1].name, 'p2 updated');
                });
            });

            it('does not change db outside transaction context', async () => {
                await jsonDB.insert('projects', { name: 'p0', tagsIds: [] });

                await jsonDB.transaction(async tx => {
                    await tx.insert('projects', {name: 'p1', tagsIds: []});
                    await tx.insert('projects', {name: 'p2', tagsIds: []});

                    await tx.update('projects', 3, {
                        name: 'p2 updated'
                    });

                    await tx.delete('projects', 1);

                    const data = await jsonDB.read();

                    should.equal(data.projects.length, 1);
                    should.equal(data.projects[0].id, 1);
                    should.equal(data.projects[0].name, 'p0');
                });
            });

            it('read, insert, update, delete actions wait for the current transaction to finish');

            it('transactions wait for the current transaction to finish');

            it('throws an error from the transaction if any', async () => {
                await jsonDB.insert('projects', { name: 'p0', tagsIds: [] });

                await promiseShouldThrow(async () => {
                    await jsonDB.transaction(async tx => {
                        await tx.insert('projects', { name: 'p1', tagsIds: [] });
                        await tx.insert('projects', { name: 'p2', tagsIds: [] });

                        await tx.update('projects', 3, {
                            name: 'p2 updated'
                        });

                        await tx.delete('projects', 4);
                    });
                });
            });

            it('reverts pre-transaction state in case of an error', async () => {
                await jsonDB.insert('projects', { name: 'p0', tagsIds: [] });

                try {
                    await jsonDB.transaction(async tx => {
                        await tx.insert('projects', {name: 'p1', tagsIds: []});
                        await tx.insert('projects', {name: 'p2', tagsIds: []});

                        await tx.update('projects', 3, {
                            name: 'p2 updated'
                        });

                        await tx.delete('projects', 4);
                    });
                }
                catch(err) {

                }

                const data = await jsonDB.read();

                should.equal(data.projects.length, 1);
                should.equal(data.projects[0].id, 1);
                should.equal(data.projects[0].name, 'p0');
            });

            it('returns value from callback');
        });

        describe('rollback', () => {

        });
    });

    describe('id counter', () => {
        it('preserves id counter value after deleting a record', async () => {
            await jsonDB.insert('projects', { name: 'p1', tagsIds: [] });
            await jsonDB.delete('projects', 1);
            const project = await jsonDB.insert('projects', { name: 'p2', tagsIds: [] });

            const data = await jsonDB.read();
            const dataProject = data.projects.find(p => p.id === 2);

            should.equal(project.id, 2);

            should.exist(dataProject);
            if (dataProject) {
                should.equal(dataProject.id, 2);
            }

        });
    });

    describe('db backup', () => {
        it('creates a backup on save');
    });

    describe('adapters', () => {
        describe('file', () => {
            const jsonDb = new JsonDB({
                adapter: new Adapters.File({
                    filePath: './db.test.json'
                }),
            });
        });

        describe('localStorage', () => {
            const lsMockData: {[key: string]: string} = {};
            const lsMock = {
                getItem(key: string) {
                    return lsMockData[key] || null;
                },
                setItem(key: string, val: string) {
                    lsMockData[key] = val;
                },
            }

            const jsonDb = new JsonDB({
                adapter: new Adapters.LocalStorage({
                    name: 'db.test',
                    localStorage: lsMock,
                }),
            });
        });
    });
});

// // class Store<C extends string, R extends {[K in C]: {[key: string]: any}}, P extends {[K in C]: {[key: string]: any}}> {
// interface CommonFields {
//     id: number;
//     createdAt: string;
//     updatedAt: string;
// }

// class Store<R extends {[K: string]: CommonFields}> {

//     load() {
//         const data: { [K in keyof R]: R[K][] } = {
//             a: [
//                 { test: 'a' },
//                 { test: 'b' },
//             ],
//             b: [
//                 { ble: 1 },
//                 { ble: 2 },
//             ],
//         } as any;

//         return data;
//     }

//     find<C extends keyof R>(collName: C): R[C][] {
//         const data = this.load();

//         return data[collName];
//     }

//     findOne<C extends keyof R>(collName: C, id: number): R[C] | null {
//         const data = this.load();

//         const coll = data[collName];
//         const rec = coll.find(r => r.id === id);

//         return rec || null;
//     }

//     create<C extends keyof R>(collName: C, body: Omit<R[C], keyof CommonFields>): R[C] {
//         const data = this.load();

//         const coll = data[collName];
//         const baseObj: CommonFields = { id: 1, createdAt: '', updatedAt: '' };
//         const rec = Object.assign(baseObj, body) as R[C];

//         coll.push(rec);

//         return rec;
//     }

//     // update<C extends keyof R>(collName: keyof R, id: number, body: Omit<Partial<R[C]>, keyof CommonFields>): R[C] {
//     update<C extends keyof R>(collName: C, id: number, body: Partial<Omit<R[C], keyof CommonFields>>): R[C] {
//         const data = this.load();

//         const coll = data[collName];
//         const rec = coll.find(r => r.id === id);
//         if (!rec) throw new Error();

//         Object.assign(rec, body);

//         return rec;
//     }
// }

// type StoreResponsesObj = {
//     a: {
//         id: number;
//         createdAt: string;
//         updatedAt: string;
//         test: string;
//     };
//     b: {
//         id: number;
//         createdAt: string;
//         updatedAt: string;
//         ble: number;
//     };
// };
// // type StorePayloadsObj = {
// //     a: {
// //         test?: string;
// //     };
// //     b: {
// //         ble?: number;
// //     };
// // };

// // const store = new Store<'a' | 'b', StoreResponsesObj>();
// const store = new Store<StoreResponsesObj>();

// {
//     const findRes = store.find('a');
//     findRes.map(r => r.test);

//     const findOneRes = store.findOne('a', 1);
//     if (findOneRes) findOneRes.test;

//     const cRes = store.create('a', {test: ''});
//     cRes.test

//     const uRes = store.update('a', 1, {});
//     uRes.test
// }

// {
//     const findRes = store.find('b');
//     findRes.map(r => r.ble);

//     const findOneRes = store.findOne('b', 1);
//     if (findOneRes) findOneRes.ble;

//     const cRes = store.create('b', { ble: 123 });
//     cRes.ble

//     const uRes = store.update('b', 1, {});
//     uRes.ble
// }