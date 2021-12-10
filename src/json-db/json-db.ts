// import * as _ from 'lodash'
import * as path from 'path'
import * as fs from 'fs'
// import * as moment from 'moment'
// import { sync as writeFileAtomicSync } from 'write-file-atomic'
// import * as writeFileAtomic from 'write-file-atomic'

export type RecordId = number;

type CollectionsObj<T> = {
    [C in keyof T]: T[C][];
}

export interface FileContent<T> {
    readonly counters: {
        [C in keyof T]: number;
    };
    readonly collections: CollectionsObj<T>;
}

// export function getEmptyFileContents<T, C extends keyof T = keyof T>(collNames: C[]): FileContent<T> {
export function getEmptyFileContents(collNames: string[]) {
    // return {
    //     // counters: Object.fromEntries(collNames.map(collName => [collName, 0])),
    //     counters: Object.fromEntries(collNames.map(collName => [collName, 0])),
    //     collections: Object.fromEntries(collNames.map(collName => [collName, []])),
    // };

    // const res = { counters: {}, collections: {} } as FileContent<T>;
    const res: { counters: {[key: string]: number}, collections: {[key: string]: {}[]} } = { counters: {}, collections: {} };

    for (const collName of collNames) {
        res.counters[collName] = 0;
        res.collections[collName] = [];
    }

    return res;
};

interface Bla {
    a: {x: number};
    b: {y: string};
}

const x: BatchInsertOp<Bla> = {
    type: 'insert',
    collection: 'a',
    body: {},
};

interface BatchInsertOp<T, C extends keyof T = keyof T> {
    type: 'insert';
    collection: C;
    body: Omit<T[C], keyof CommonFields>;
    // body: T[C];
}

interface BatchUpdateOp<T, C extends keyof T = keyof T> {
    type: 'update';
    collection: C;
    id: RecordId;
    body: Partial<Omit<T[C], keyof CommonFields>>;
}

interface BatchDeleteOp<T, C extends keyof T = keyof T> {
    type: 'delete';
    collection: C;
    id: RecordId;
}

// type BatchOp<T, C extends keyof T> = BatchInsertOp<T, C> | BatchUpdateOp<T, C> | BatchDeleteOp<T, C>;
type BatchOp<T> = BatchInsertOp<T> | BatchUpdateOp<T> | BatchDeleteOp<T>;

interface CommonFields {
    id: RecordId;
    createdAt: string;
    updatedAt: string;
}

abstract class JsonDbAdapter {
    abstract read(): string | Promise<string>;
    abstract write(text: string): void | Promise<void>;
}

export namespace Adapters {
    export class Memory extends JsonDbAdapter {
        constructor(readonly opts?: {db?: string}) {
            super();

            if (opts?.db) this.db = opts.db;
        }

        db = '';

        read() {
            return this.db;
        }

        write(text: string) {
            this.db = text;
        }
    }

    export class File extends JsonDbAdapter {
        constructor(readonly opts: {filePath: string}) {
            super();
        }

        read() {
            return fs.promises.readFile(this.opts.filePath, { encoding: 'utf-8' });
        }

        write(text: string) {
            return fs.promises.writeFile(this.opts.filePath, text);
        }
    }

    interface LSLike {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
        // removeItem(key: string): void;
        // clear(): void;
    }

    // declare var localStorage: LSLike;

    export class LocalStorage extends JsonDbAdapter {
        private localStorage: LSLike;

        constructor(readonly opts: {name: string, localStorage?: LSLike}) {
            super();

            if (this.opts.localStorage !== undefined) this.localStorage = this.opts.localStorage;
        }

        read() {
            const val = this.localStorage.getItem(this.opts.name);
            if (val === null) throw new Error(`localStorage db does not exist under the key: ${this.opts.name}`);

            return val;
        }

        write(text: string) {
            return this.localStorage.setItem(this.opts.name, text);
        }
    }
}

interface Opts {
    // readonly filePath: string;
    readonly adapter: JsonDbAdapter;
    readonly backupFile?: boolean;
    // readonly findById: (coll: keyof Res, rec: Res[keyof Res], id: RecordId) => boolean;
    // collections: (keyof FileContent<Response>['collections'])[]
}

// export default class JsonDB<TResponse, TPayload extends {[K in keyof TPayload]: object}> {
export class JsonDB<
    // T extends { [key: string]: CommonFields }
    T extends { [K in keyof T]: CommonFields }
    // PayloadsObj extends { [CollName in keyof PayloadsObj]: object }
    // C extends string = keyof TResponse & keyof TPayload
    > {
    // private currentIO: Promise<any> = Promise.resolve();

    constructor(readonly opts: Opts) {

    }

    private getDateString(): string {
        return new Date().toISOString();
    }

    // private getRecordById<CollName extends keyof ResponsesObj>(collections: FileContent<ResponsesObj>['collections'], coll: CollName, id: RecordId) {
    //     const record = collections[coll].find(rec => this.opts.findById(coll, rec, id));

    //     if (!record) {
    //         throw new Error(`Record doesn't exist (${coll}#${id})`);
    //     }

    //     return record;
    // }

    private readDbRaw() {
        // return fs.readFileSync(this.opts.filePath, { encoding: 'utf-8' });
        return this.opts.adapter.read();
    }

    private writeDbRaw(str: string) {
        // fs.writeFileSync(this.opts.filePath, str);
        return this.opts.adapter.write(str);
    }

    // async loadData(): Promise<FileContent<Response>> {
    private async loadData(): Promise<FileContent<T>> {
        // await this.currentIO

        // const promise = this.currentIO = new Promise<FileContent<Response>>((res, rej) => {
        //   fs.readFile(this.opts.filePath, {encoding: 'utf-8'}, (err, text) => {
        //     if (err) return rej(err)

        //     // @todo validate content - throw error if it doesn't match schema
        //     res(JSON.parse(text))
        //   })
        // })

        // return promise
        const text = await this.readDbRaw();

        return JSON.parse(text);
    }

    // async saveData(data: FileContent<Response>): Promise<void> {
    private saveData(data: FileContent<T>) {
        // // fs.writeFileSync(this.opts.filePath, JSON.stringify(data, null, 2))

        // await this.currentIO

        // if (this.opts.backupFile) {
        //   await this.backupData()
        // }

        // const promise = this.currentIO = new Promise((res, rej) => {
        //   // console.log('about to write')
        //   writeFileAtomic(this.opts.filePath, JSON.stringify(data, null, 2), err => {
        //     if (err) rej(err)
        //     // console.log('written')

        //     res()
        //   })
        // })

        // return promise

        if (this.opts.backupFile) {
            // this.backupData();
        }

        // writeFileAtomicSync(this.opts.filePath, JSON.stringify(data, null, 2));
        return this.writeDbRaw(JSON.stringify(data, null, 2));
    }

    private preValidateBody<C extends keyof T>(body: Partial<Omit<T[C], keyof CommonFields>>) {
        Object.entries(body).forEach(([key, val]) => {
            if (val === undefined) throw new Error(`invalid undefined value for key "${key}"`);
        });
    }

    // private async backupData(): Promise<void> {
    //     // const data = await this.loadData()
    //     const data = this.loadData();
    //     const dir = path.dirname(this.opts.filePath);
    //     const ext = path.extname(this.opts.filePath);
    //     const name = path.basename(this.opts.filePath, ext);
    //     const ts = this.getDateString().replace(/:|\./g, '');
    //     const filename = `${name}_backup_${ts}-${_.uniqueId()}${ext}`;
    //     const backupPath = path.join(dir, filename);
    //     //  console.log("backupPath ", backupPath);

    //     return new Promise((res, rej) => {
    //         fs.writeFile(backupPath, JSON.stringify(data, undefined, 2), err => {
    //             if (err) return rej(err);

    //             res();
    //         });
    //     });
    // }

    readonly validate = {
        onInsert: (cb: <C extends keyof T>(collName: C, body: Omit<T[C], keyof CommonFields>) => void) => {
            this.validate_onInsert = cb;
        },
        onUpdate: (cb: <C extends keyof T>(collName: C, id: RecordId, body: Partial<Omit<T[C], keyof CommonFields>>) => void) => {
            this.validate_onUpdate = cb;
        },
        onDelete: (cb: <C extends keyof T>(collName: C, id: RecordId) => void) => {
            this.validate_onDelete = cb;
        },
    };

    private validate_onInsert?: <C extends keyof T>(collName: C, body: Omit<T[C], keyof CommonFields>) => void;
    private validate_onUpdate?: <C extends keyof T>(collName: C, id: RecordId, body: Partial<Omit<T[C], keyof CommonFields>>) => void;
    private validate_onDelete?: <C extends keyof T>(collName: C, id: RecordId) => void;

    async read(): Promise<CollectionsObj<T>> {
        const fileContent = await this.loadData();

        return fileContent.collections;
    }

    // async findAll<K extends keyof Response>(coll: K): Promise<Response[K][]> {
    //     // const fileContent = await this.loadData()
    //     const fileContent = this.loadData()

    //     return fileContent.collections[coll]
    // }

    // async find<K extends keyof Response>(coll: K, id: RecordId): Promise<Response[K]> {
    //     // const fileContent = await this.loadData()
    //     const fileContent = this.loadData()
    //     // const record = fileContent.collections[coll].find(rec => rec.id == id)
    //     // const record = fileContent.collections[coll].find(rec => this.opts.findById(coll, rec, id))
    //     const record = this.getRecordById(fileContent.collections, coll, id)

    //     return record
    // }

    async insert<C extends keyof T>(collName: C, body: Omit<T[C], keyof CommonFields>): Promise<T[C]> {
        this.preValidateBody(body);
        if (this.validate_onInsert) this.validate_onInsert(collName, body);

        const fileContent = await this.loadData();
        const date = this.getDateString();
        // object spread throws TS error - https://github.com/Microsoft/TypeScript/issues/14409
        // const record = {
        //   id: ++fileContent.counters[coll],
        //   createdAt: date,
        //   updatedAt: date,
        //   ...body
        // }
        const baseObj: CommonFields = {
            id: ++fileContent.counters[collName],
            createdAt: date,
            updatedAt: date,
        };
        const record = {
            ...baseObj,
            ...body,
        } as T[C];

        fileContent.collections[collName].push(record);

        // await this.saveData(fileContent)
        await this.saveData(fileContent);

        return record;
    }

    // insertMany(coll: keyof Res, bodyArr: Body[keyof Body][]) {
    //     return bodyArr.map(body => {
    //         return this.insert(coll, body);
    //     });
    // }

    // private testIO: Promise<any> = Promise.resolve();
    // private blabla: Promise<any> = Promise.resolve();
    // private queue: (() => Promise<any>)[] = [];

    // private async schedule<T>(fn: () => Promise<T>): Promise<T> {
    //     this.queue.push(fn);

    //     // await this.blabla
    //     // await [...this.queue].reverse()[0]
    //     await this.queue[0];

    //     // this.blabla = fn()
    //     const x = await fn();

    //     // remove last item
    //     this.queue.shift();

    //     // return this.blabla
    //     return x;
    // }

    async update<C extends keyof T>(collName: C, id: RecordId, body: Partial<Omit<T[C], keyof CommonFields>>): Promise<T[C]> {
        this.preValidateBody(body);
        if (this.validate_onUpdate) this.validate_onUpdate(collName, id, body);

        // await this.testIO

        // const update = async () => {
        const fileContent = await this.loadData();
        // const record = this.getRecordById(fileContent.collections, coll, id);
        const record = fileContent.collections[collName].find(rec => rec.id === id);
        if (!record) throw new Error();

        const updatedAt = this.getDateString();

        Object.assign(record, { updatedAt }, body);

        // await this.saveData(fileContent)
        await this.saveData(fileContent);

        // await new Promise((res) => {
        //   setTimeout(() => {
        //     res()
        //   }, 1000)
        // })

        return record;
        // res(record)
        // }

        // return this.schedule(update)

        // this.testIO = new Promise()

        // return this.testIO
    }

    async delete<C extends keyof T>(collName: C, id: RecordId): Promise<T[C]> {
        if (this.validate_onDelete) this.validate_onDelete(collName, id);

        const fileContent = await this.loadData();
        const record = fileContent.collections[collName].find(rec => rec.id === id);
        if (!record) throw new Error();

        const index = fileContent.collections[collName].indexOf(record);
        fileContent.collections[collName].splice(index, 1);

        await this.saveData(fileContent);

        return record;
    }

    // @todo fix typescript body check
    // batch<C extends keyof T>(ops: BatchOp<T, C>[]) {
    async batch(ops: BatchOp<T>[]) {
        const dataBefore = await this.loadData();
        const res = [];

        try {
            for (const op of ops) {
                let data;

                if (op.type === 'insert') {
                    data = await this.insert(op.collection, op.body);
                }
                else if (op.type === 'update') {
                    data = await this.update(op.collection, op.id, op.body);
                }
                else if (op.type === 'delete') {
                    data = await this.delete(op.collection, op.id);
                }
                else {
                    throw new Error(`invalid operation type: ${(op as any).type}`);
                }

                res.push(data);
            }
        }
        catch (err) {
            await this.saveData(dataBefore);

            throw err;
        }

        return res;
    }

    async transaction(cb: (tx: JsonDB<T>) => void | Promise<void>) {
        const dbText = await this.readDbRaw();

        const memAdapter = new Adapters.Memory({ db: dbText });
        const tempDb = new JsonDB<T>({
            ...this.opts,
            adapter: memAdapter,
        });

        await cb(tempDb);

        await this.writeDbRaw(memAdapter.db);
    }

    async clear() {
        const fileContent = await this.loadData();

        for (const collName in fileContent.collections) {
            fileContent.counters[collName] = 0;
            fileContent.collections[collName] = [];
        }

        await this.saveData(fileContent);
    }
}

// interface CUDHandle {
//     create
// }