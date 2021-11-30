import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';

import { JsonDB, getEmptyFileContents, RecordId } from '../src/json-db/json-db';

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
        filePath: DB_FILE_PATH,
        // findById: (coll, rec, id) => {
        //     // rec.
        // },
    });
}

const jsonDB = createDbFile();

describe('', () => {
    beforeEach(() => {
        jsonDB.clear();
    });

    after(() => {
        // remove file

        fs.unlinkSync(DB_FILE_PATH);
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
    });

    it('loads content', () => {
        const dataBefore = jsonDB.read();

        should.deepEqual(Object.keys(dataBefore), ['users', 'projects', 'tags']);
        should.equal(dataBefore.users.length, 0);
        should.equal(dataBefore.projects.length, 0);
        should.equal(dataBefore.tags.length, 0);

        jsonDB.insert('users', {email: 'aaa@bbb.com'});
        jsonDB.insert('projects', {name: 'p1'});
        jsonDB.insert('tags', {name: '', parentId: null});

        const dataAfter = jsonDB.read();

        should.deepEqual(Object.keys(dataBefore), ['users', 'projects', 'tags']);
        should.equal(dataAfter.users.length, 1);
        should.equal(dataAfter.projects.length, 1);
        should.equal(dataAfter.tags.length, 1);
    });

    describe('creating record', () => {
        // it('throws when payload contains id field', () => {
        //     should.throws(() => {
        //         jsonDB.insert('projects', { id: 123, name: 'test 1' });
        //     });
        // });

        // it('throws when payload contains timestamp fields', () => {
        //     should.throws(() => {
        //         jsonDB.insert('projects', { createdAt: '', name: 'test 1' });
        //         jsonDB.insert('projects', { updatedAt: '', name: 'test 1' });
        //     });
        // });

        it('throws when references id of non-existent record', () => {
            should.throws(() => {
                jsonDB.insert('tags', {name: 't1', parentId: 123});
            });
        });

        it('adds new record to db', () => {
            const data1 = jsonDB.read();
            should.equal(data1.projects.length, 0);

            jsonDB.insert('projects', { name: 'test 1' });

            const data2 = jsonDB.read();
            should.equal(data2.projects.length, 1);

            const project = data2.projects[0];
            should.exist(project);

            should.equal(project.id, 1);
            should.equal(project.name, 'test 1');
        });

        it('adds timestamps', () => {
            jsonDB.insert('projects', { name: 'test 1' });

            const data = jsonDB.read();
            const p1 = data.projects[0];

            should.equal(typeof p1.createdAt, 'string');
            should.equal(typeof p1.updatedAt, 'string');
        });

        it('returns newly created record', () => {
            const project = jsonDB.insert('projects', { name: 'test 1' });

            should.deepEqual(Object.keys(project), ['id', 'createdAt', 'updatedAt', 'name']);
            should.equal(project.id, 1);
            should.equal(project.name, 'test 1');
        });

        it('increases ID counter', () => {
            const p1 = jsonDB.insert('projects', { name: 'test 1' });
            const p2 = jsonDB.insert('projects', { name: 'test 2' });
            const t1 = jsonDB.insert('tags', { name: 'tag 1', parentId: null });

            should.equal(p1.id, 1);
            should.equal(p2.id, 2);
            should.equal(t1.id, 1);
        });

        // it('ignores undefineds in body', () => {
        //     jsonDB.insert('tags', { name: 'test 1 });
        // });

        it('ignores undefineds in body', () => {
            should.throws(() => {
                // use "any" to force undefined
                jsonDB.insert('projects', { name: undefined as any });
            });
        });
    });

    describe('updating record', () => {
        it('throws when id not found', () => {
            should.throws(() => {
                jsonDB.update('projects', 1, {});
            });
        });

        it('throws when references id of non-existent record', () => {
            should.throws(() => {
                // jsonDB.update('projects', 1, {});
                jsonDB.insert('tags', { name: 't1', parentId: null });
                jsonDB.update('tags', 1, {parentId: 123});
            });
        });

        // it('throws when payload contains id field', () => {

        // });

        // it('throws when payload contains timestamp fields', () => {

        // });

        it('updates record in db', () => {
            jsonDB.insert('projects', {name: 'p1'});
            jsonDB.update('projects', 1, {name: 'p1 updated'});

            const data = jsonDB.read();

            should.equal(data.projects.length, 1);
            should.equal(data.projects[0].name, 'p1 updated');
        });

        it('returns updated record', () => {
            jsonDB.insert('projects', {name: 'p1'});
            const p1 = jsonDB.update('projects', 1, {name: 'p1 updated'});

            should.deepEqual(Object.keys(p1), ['id', 'createdAt', 'updatedAt', 'name']);
            should.equal(p1.id, 1);
            should.equal(typeof p1.createdAt, 'string');
            should.equal(typeof p1.updatedAt, 'string');
            should.equal(p1.name, 'p1 updated');
        });

        it('does not change fields not present in body', () => {
            jsonDB.insert('tags', { name: 'tag 1', parentId: null });
            jsonDB.insert('tags', { name: 'tag 2', parentId: 1 });

            const tagRes1 = jsonDB.update('tags', 2, {name: 'tag 2 updated'});

            should.equal(tagRes1.name, 'tag 2 updated');
            should.equal(tagRes1.parentId, 1);

            const tagRes2 = jsonDB.update('tags', 2, {parentId: null});

            should.equal(tagRes2.name, 'tag 2 updated');
            should.equal(tagRes2.parentId, null);

        });

        it('updates timestamp', () => {
            const res1 = jsonDB.insert('tags', { name: 'tag', parentId: null });

            return new Promise((res) => {
                setTimeout(() => {
                    const res2 = jsonDB.update('tags', 1, { name: 'tag updated' });

                    should.equal(res1.createdAt === res2.createdAt, true);
                    should.equal(res1.updatedAt === res2.updatedAt, false);

                    res(null);
                }, 10);
            });
        });

        it('ignores undefineds in body', () => {
            jsonDB.insert('projects', {name: 'p1'});

            should.throws(() => {
                jsonDB.update('projects', 1, {name: undefined});
            });
        });
    });

    describe('deleting record', () => {
        it('throws when id not found', () => {
            should.throws(() => {
                jsonDB.delete('projects', 1);
            });
        });

        it('throws when deleting record that is referenced elsewhere', () => {
            should.throws(() => {
                // jsonDB.update('projects', 1, {});
                jsonDB.insert('tags', { name: 't1', parentId: null });
                jsonDB.insert('tags', { name: 't2', parentId: 1 });
                jsonDB.delete('tags', 1);
            });
        });

        it('removes record from db', () => {
            jsonDB.insert('projects', { name: 'p1' });
            jsonDB.delete('projects', 1);

            const data = jsonDB.read();

            should.equal(data.projects.length, 0);
        });

        it('returns deleted record', () => {
            jsonDB.insert('projects', { name: 'p1' });
            const project = jsonDB.delete('projects', 1);

            should.deepEqual(Object.keys(project), ['id', 'createdAt', 'updatedAt', 'name']);
            should.equal(project.id, 1);
            should.equal(typeof project.createdAt, 'string');
            should.equal(typeof project.updatedAt, 'string');
            should.equal(project.name, 'p1');
        });
    });

    describe('clearing data', () => {
        it('clears data', () => {
            jsonDB.insert('users', { email: 'u1' });
            jsonDB.insert('projects', { name: 'p1' });
            jsonDB.insert('tags', { name: 't1', parentId: null });

            jsonDB.clear();

            const data = jsonDB.read();

            should.equal(data.users.length, 0);
            should.equal(data.projects.length, 0);
            should.equal(data.tags.length, 0);
        });
    });

    describe('batch', () => {
        it('executes in sequence', () => {
            jsonDB.insert('projects', {name: 'p1'});
            jsonDB.insert('projects', {name: 'p2'});
            jsonDB.insert('projects', {name: 'p3'});

            const batchRes = jsonDB.batch([
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

            const data = jsonDB.read();

            should.equal(data.projects.length, 3);
            should.equal(data.projects[0].name, 'p1 updated');
            should.equal(data.projects[1].name, 'p2 updated');
            should.equal(data.projects[2].id, 4);
            should.equal(data.projects[2].name, 'p4');
        });

        it('returns array of results');

        it('reverts all operations if an error occurred in any of them');
    });

    describe('id counter', () => {
        it('preserves id counter value after deleting a record', () => {
            jsonDB.insert('projects', { name: 'p1' });
            jsonDB.delete('projects', 1);
            const project = jsonDB.insert('projects', { name: 'p2' });

            const data = jsonDB.read();
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