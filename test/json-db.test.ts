import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';

import { JsonDB, getEmptyFileContents, RecordId, Adapters } from '../src/json-db/json-db';

async function promiseShouldThrow(cb: () => void | Promise<void>) {
    try {
        await cb();

        should.throws(() => {
            // empty here
        });
    }
    catch (err) {
        // empty here to ignore the error
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
    const data = getEmptyFileContents(['users', 'projects', 'tags']);
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data));

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

        it('throws when any record has invalid schema');

        it('test', () => {
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
            // jsonDB.hooks.beforeDelete(collName, id => {
            //     // removes records that reference deleted record

            //     if (collName === 'tags') {
            //         const { projects, tags } = jsonDB.read()
            //         const tagChildren = tags.filter(t => t.parentId === id);

            //         if (tagChildren.length > 0) {
            //             throw new Error();
            //         }

            //         const tagProjects = projects.filter(p => p.tagsIds.includes(id));

            //         if (tagProjects.length > 0) {
            //             throw new Error();
            //         }
            //     }
            // });
        });
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
        it('read, insert, update, delete actions wait for other modify actions to finish');
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

    describe('batch', () => {
        it('executes in sequence', async () => {
            await jsonDB.insert('projects', {name: 'p1', tagsIds: []});
            await jsonDB.insert('projects', {name: 'p2', tagsIds: []});
            await jsonDB.insert('projects', {name: 'p3', tagsIds: []});

            const batchRes = await jsonDB.batch([
                {
                    type: 'insert',
                    collection: 'projects',
                    body: {name: 'p4'},
                },
                {
                    type: 'insert',
                    collection: 'tags',
                    body: {name: 'p4'},
                },
                {
                    type: 'update',
                    collection: 'projects',
                    id: 1,
                    body: {name: 'p1 updated'}
                },
                {
                    type: 'update',
                    collection: 'projects',
                    id: 2,
                    body: {name: 'p2 updated'}
                },
                {
                    type: 'delete',
                    collection: 'projects',
                    id: 3,
                },
            ]);

            should.equal(batchRes.length, 5);

            const data = await jsonDB.read();

            should.equal(data.projects.length, 3);
            should.equal(data.projects[0].name, 'p1 updated');
            should.equal(data.projects[1].name, 'p2 updated');
            should.equal(data.projects[2].id, 4);
            should.equal(data.projects[2].name, 'p4');
        });

        it('returns array of results');

        it('reverts all operations if an error occurred in any of them');
    });

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