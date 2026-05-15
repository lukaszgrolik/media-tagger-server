import * as fs from 'fs';
import * as path from 'path';
const BetterSqlite3 = require('better-sqlite3');

import * as Adapters from './adapters';
import PromiseQueue from './promise-queue';

export * as Adapters from './adapters';

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

export function getEmptyFileContents(collNames: string[]) {
    const res: { counters: {[key: string]: number}, collections: {[key: string]: {}[]} } = { counters: {}, collections: {} };

    for (const collName of collNames) {
        res.counters[collName] = 0;
        res.collections[collName] = [];
    }

    return res;
};

interface CommonFields {
    id: RecordId;
    createdAt: string;
    updatedAt: string;
}

interface Opts<T extends { [K in keyof T]: CommonFields }> {
    readonly adapter: Adapters.StorageAdapter;
    readonly backupFile?: boolean;
    readonly collections?: (keyof T & string)[];
    readonly hooks?: {
        [C in keyof T]?: {
            beforeInsert?: (body: Omit<T[C], keyof CommonFields>) => void | Promise<void>;
            beforeUpdate?: (id: RecordId, body: Partial<Omit<T[C], keyof CommonFields>>) => void | Promise<void>;
            beforeDelete?: (id: RecordId) => void | Promise<void>;
            afterInsert?: (record: T[C]) => void | Promise<void>;
            afterUpdate?: (record: T[C]) => void | Promise<void>;
            afterDelete?: (record: T[C]) => void | Promise<void>;
        };
    }
}

type SqlRecord = {
    collection_name: string;
    id: number;
    created_at: string;
    updated_at: string;
    body_json: string;
};

const sleep = (delayMs: number) => {
    if (delayMs <= 0) {
        return Promise.resolve();
    }

    return new Promise<void>(res => {
        setTimeout(res, delayMs);
    });
};

const isObject = (value: unknown): value is {[key: string]: unknown} => {
    return typeof value === 'object' && value !== null;
};

const deepMerge = (objA: {[key: string]: unknown}, objB: {[key: string]: unknown}) => {
    Object.entries(objB).forEach(([key, val]) => {
        if (isObject(val) && Array.isArray(val) === false) {
            if (isObject(objA[key]) === false || Array.isArray(objA[key])) {
                objA[key] = {};
            }

            deepMerge(objA[key] as {[key: string]: unknown}, val);
            return;
        }

        objA[key] = val;
    });
};

function stripCommonFields(record: {[key: string]: unknown}): {[key: string]: unknown} {
    const out: {[key: string]: unknown} = {};

    Object.entries(record).forEach(([key, value]) => {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
            return;
        }

        out[key] = value;
    });

    return out;
}

function parseLegacyFileContent<T>(text: string): FileContent<T> | null {
    try {
        const obj = JSON.parse(text);
        if (!isObject(obj)) {
            return null;
        }

        if (!isObject((obj as any).counters) || !isObject((obj as any).collections)) {
            return null;
        }

        return obj as unknown as FileContent<T>;
    }
    catch {
        return null;
    }
}

function isJsonText(text: string): boolean {
    const trimmed = text.trimStart();

    return trimmed.startsWith('{') || trimmed.startsWith('[');
}

export class SqliteStore<
    T extends { [K in keyof T]: CommonFields }
    > {
    private writeOpsQueue = new PromiseQueue();
    private sqlite: any;

    constructor(readonly opts: Opts<T>) {
        const { sqlitePath, legacySeed } = this.resolveStoragePaths();

        this.sqlite = new BetterSqlite3(sqlitePath);
        this.sqlite.pragma('journal_mode = WAL');
        this.sqlite.pragma('foreign_keys = ON');

        this.initSchema();

        if (legacySeed) {
            const hasRows = this.sqlite.prepare('SELECT COUNT(*) AS count FROM records').get() as {count: number};
            if (hasRows.count === 0) {
                this.importFileContent(legacySeed);
            }
        }

        if (this.opts.collections?.length) {
            this.ensureCollections(this.opts.collections as string[]);
        }

        if (this.opts.adapter instanceof Adapters.Memory) {
            const parsed = parseLegacyFileContent<T>(this.opts.adapter.db);
            if (parsed) {
                const hasRows = this.sqlite.prepare('SELECT COUNT(*) AS count FROM records').get() as {count: number};
                if (hasRows.count === 0) {
                    this.importFileContent(parsed);
                }
            }
        }
        else if (this.opts.adapter instanceof Adapters.LocalStorage) {
            let parsed: FileContent<T> | null = null;
            try {
                parsed = parseLegacyFileContent<T>(this.opts.adapter.getJsonText());
            }
            catch {
                parsed = null;
            }

            if (parsed) {
                const hasRows = this.sqlite.prepare('SELECT COUNT(*) AS count FROM records').get() as {count: number};
                if (hasRows.count === 0) {
                    this.importFileContent(parsed);
                }
            }
        }
    }

    private resolveStoragePaths(): { sqlitePath: string; legacySeed: FileContent<T> | null } {
        if (this.opts.adapter instanceof Adapters.File === false) {
            return {
                sqlitePath: ':memory:',
                legacySeed: null,
            };
        }

        const originalPath = path.resolve(this.opts.adapter.opts.filePath);
        const ext = path.extname(originalPath).toLowerCase();
        const sqlitePath = ext === '.json'
            ? originalPath.replace(/\.json$/i, '.sqlite')
            : originalPath;

        const sqliteDir = path.dirname(sqlitePath);
        if (fs.existsSync(sqliteDir) === false) {
            fs.mkdirSync(sqliteDir, { recursive: true });
        }

        if (ext === '.json' && fs.existsSync(originalPath)) {
            const legacyText = fs.readFileSync(originalPath, 'utf8');
            if (isJsonText(legacyText)) {
                return {
                    sqlitePath,
                    legacySeed: parseLegacyFileContent<T>(legacyText),
                };
            }
        }

        return {
            sqlitePath,
            legacySeed: null,
        };
    }

    private initSchema() {
        this.sqlite.exec(`
            CREATE TABLE IF NOT EXISTS collections (
                name TEXT PRIMARY KEY,
                counter INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS records (
                collection_name TEXT NOT NULL,
                id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                body_json TEXT NOT NULL,
                PRIMARY KEY (collection_name, id),
                FOREIGN KEY (collection_name) REFERENCES collections(name) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection_name);
        `);
    }

    private getDateString(): string {
        return new Date().toISOString();
    }

    private preValidateBody<C extends keyof T>(body: Partial<Omit<T[C], keyof CommonFields>>) {
        Object.entries(body).forEach(([key, val]) => {
            if (val === undefined) throw new Error(`invalid undefined value for key "${key}"`);
        });
    }

    private ensureCollections(collNames: string[]) {
        const tx = this.sqlite.transaction((names: string[]) => {
            for (const collName of names) {
                const existing = this.sqlite
                    .prepare('SELECT name FROM collections WHERE name = ?')
                    .get(collName) as {name: string} | undefined;

                if (existing) {
                    continue;
                }

                const maxPosRow = this.sqlite
                    .prepare('SELECT COALESCE(MAX(position), -1) AS max_position FROM collections')
                    .get() as {max_position: number};

                this.sqlite
                    .prepare('INSERT INTO collections(name, counter, position) VALUES (?, 0, ?)')
                    .run(collName, maxPosRow.max_position + 1);
            }
        });

        tx(collNames);
    }

    private rowToRecord<C extends keyof T>(row: SqlRecord): T[C] {
        const parsedBody = JSON.parse(row.body_json) as Omit<T[C], keyof CommonFields>;

        return {
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            ...parsedBody,
        } as T[C];
    }

    private getCounter(collName: string): number {
        const row = this.sqlite
            .prepare('SELECT counter FROM collections WHERE name = ?')
            .get(collName) as {counter: number} | undefined;

        if (!row) {
            throw new Error(`collection not found: ${collName}`);
        }

        return row.counter;
    }

    private setCounter(collName: string, value: number) {
        this.sqlite
            .prepare('UPDATE collections SET counter = ? WHERE name = ?')
            .run(value, collName);
    }

    private async persistAdapterSnapshot() {
        await sleep(this.opts.adapter.delay);

        if (this.opts.adapter instanceof Adapters.Memory) {
            this.opts.adapter.db = JSON.stringify(this.getFileContent(), null, 2);
        }
        else if (this.opts.adapter instanceof Adapters.LocalStorage) {
            this.opts.adapter.setJsonText(JSON.stringify(this.getFileContent(), null, 2));
        }
    }

    private normalizeTagRecord(record: {[key: string]: unknown}, rankFallback: number, dateFallback: string): {[key: string]: unknown} {
        const normalized = { ...record };

        if (normalized.createdAt === undefined || normalized.createdAt === null || normalized.createdAt === '') {
            normalized.createdAt = dateFallback;
        }

        if (normalized.updatedAt === undefined || normalized.updatedAt === null || normalized.updatedAt === '') {
            normalized.updatedAt = normalized.createdAt;
        }

        if (normalized.rank === undefined || normalized.rank === null) {
            normalized.rank = rankFallback;
        }

        return normalized;
    }

    private normalizeFileRecord(record: {[key: string]: unknown}, dateFallback: string): {[key: string]: unknown} {
        const normalized = { ...record };

        if (normalized.createdAt === undefined || normalized.createdAt === null || normalized.createdAt === '') {
            normalized.createdAt = typeof normalized.updatedAt === 'string' && normalized.updatedAt.length > 0
                ? normalized.updatedAt
                : dateFallback;
        }

        if (normalized.updatedAt === undefined || normalized.updatedAt === null || normalized.updatedAt === '') {
            normalized.updatedAt = normalized.createdAt;
        }

        return normalized;
    }

    private importFileContent(fileContent: FileContent<T>) {
        const tx = this.sqlite.transaction((content: FileContent<T>) => {
            this.sqlite.prepare('DELETE FROM records').run();
            this.sqlite.prepare('DELETE FROM collections').run();

            const collectionNames = Object.keys(content.collections);
            const tagIdRemap = new Map<number, number>();

            collectionNames.forEach((collName, i) => {
                this.sqlite
                    .prepare('INSERT INTO collections(name, counter, position) VALUES (?, 0, ?)')
                    .run(collName, i);
            });

            collectionNames.forEach(collName => {
                const records = ((content.collections as unknown) as {[key: string]: {[key: string]: unknown}[]})[collName] || [];
                const counterValueRaw = (content.counters as {[key: string]: number})[collName] || 0;
                const usedIds = new Set<number>();
                let maxId = 0;

                const allocateId = (preferredId: number | null) => {
                    if (preferredId !== null && preferredId > 0 && usedIds.has(preferredId) === false) {
                        usedIds.add(preferredId);

                        return preferredId;
                    }

                    let nextId = 1;
                    while (usedIds.has(nextId)) {
                        nextId += 1;
                    }

                    usedIds.add(nextId);

                    return nextId;
                };

                records.forEach((record, index) => {
                    const now = this.getDateString();
                    const normalizedBase = collName === 'tags'
                        ? this.normalizeTagRecord(record, index, now)
                        : this.normalizeFileRecord(record, now);

                    const preferredId = typeof normalizedBase.id === 'number' && Number.isInteger(normalizedBase.id)
                        ? normalizedBase.id
                        : null;

                    const id = allocateId(preferredId);
                    const normalized: {[key: string]: unknown} = {
                        ...normalizedBase,
                        id,
                    };

                    if (collName === 'tags' && preferredId !== null && preferredId !== id && tagIdRemap.has(preferredId) === false) {
                        tagIdRemap.set(preferredId, id);
                    }

                    if (collName === 'files') {
                        const tagsIdsRaw = normalized.tagsIds;
                        if (Array.isArray(tagsIdsRaw)) {
                            normalized.tagsIds = tagsIdsRaw.map(tagId => {
                                if (typeof tagId !== 'number') {
                                    return tagId;
                                }

                                return tagIdRemap.get(tagId) || tagId;
                            });
                        }
                    }

                    if (collName === 'tags' && typeof normalized.parentId === 'number') {
                        normalized.parentId = tagIdRemap.get(normalized.parentId) || normalized.parentId;
                    }

                    maxId = Math.max(maxId, id);

                    const createdAt = String(normalized.createdAt || now);
                    const updatedAt = String(normalized.updatedAt || createdAt);
                    const bodyJson = JSON.stringify(stripCommonFields(normalized));

                    this.sqlite.prepare(`
                        INSERT INTO records(collection_name, id, created_at, updated_at, body_json)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(collName, id, createdAt, updatedAt, bodyJson);
                });

                const counterValue = Math.max(counterValueRaw, maxId);
                this.sqlite
                    .prepare('UPDATE collections SET counter = ? WHERE name = ?')
                    .run(counterValue, collName);
            });
        });

        tx(fileContent);
    }

    private getFileContent(): FileContent<T> {
        const collectionRows = this.sqlite
            .prepare('SELECT name, counter FROM collections ORDER BY position ASC')
            .all() as {name: string; counter: number}[];

        const counters: {[key: string]: number} = {};
        const collections: {[key: string]: unknown[]} = {};

        collectionRows.forEach(({ name, counter }) => {
            counters[name] = counter;
            const rows = this.sqlite
                .prepare(`
                    SELECT collection_name, id, created_at, updated_at, body_json
                    FROM records
                    WHERE collection_name = ?
                    ORDER BY id ASC
                `)
                .all(name) as SqlRecord[];

            collections[name] = rows.map(row => this.rowToRecord(row as SqlRecord));
        });

        return {
            counters: counters as FileContent<T>['counters'],
            collections: collections as FileContent<T>['collections'],
        };
    }

    async read(): Promise<CollectionsObj<T>> {
        const fileContent = this.getFileContent();

        return fileContent.collections;
    }

    private async insertOp<C extends keyof T>(collName: C, body: Omit<T[C], keyof CommonFields>): Promise<T[C]> {
        this.preValidateBody(body);
        this.ensureCollections([String(collName)]);

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];
            if (collHooks && collHooks.beforeInsert) await collHooks.beforeInsert(body);
        }

        const date = this.getDateString();
        const id = this.getCounter(String(collName)) + 1;

        const record = {
            id,
            createdAt: date,
            updatedAt: date,
            ...body,
        } as T[C];

        this.sqlite.prepare(`
            INSERT INTO records(collection_name, id, created_at, updated_at, body_json)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            String(collName),
            id,
            date,
            date,
            JSON.stringify(stripCommonFields((record as unknown) as {[key: string]: unknown})),
        );

        this.setCounter(String(collName), id);

        await this.persistAdapterSnapshot();

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];
            if (collHooks && collHooks.afterInsert) await collHooks.afterInsert(record);
        }

        return record;
    }

    async insert<C extends keyof T>(collName: C, body: Omit<T[C], keyof CommonFields>): Promise<T[C]> {
        return this.writeOpsQueue.enqueue(() => {
            return this.insertOp(collName, body);
        });
    }

    private async insertManyOp<C extends keyof T>(collName: C, bodyArr: Omit<T[C], keyof CommonFields>[]): Promise<T[C][]> {
        bodyArr.forEach(body => this.preValidateBody(body));
        this.ensureCollections([String(collName)]);

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];

            for (const body of bodyArr) {
                if (collHooks && collHooks.beforeInsert) await collHooks.beforeInsert(body);
            }
        }

        const date = this.getDateString();
        let counter = this.getCounter(String(collName));

        const records = bodyArr.map(body => {
            counter += 1;
            return {
                id: counter,
                createdAt: date,
                updatedAt: date,
                ...body,
            } as T[C];
        });

        const tx = this.sqlite.transaction((rows: T[C][]) => {
            for (const record of rows) {
                this.sqlite.prepare(`
                    INSERT INTO records(collection_name, id, created_at, updated_at, body_json)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    String(collName),
                    record.id,
                    record.createdAt,
                    record.updatedAt,
                    JSON.stringify(stripCommonFields((record as unknown) as {[key: string]: unknown})),
                );
            }

            this.setCounter(String(collName), counter);
        });

        tx(records);

        await this.persistAdapterSnapshot();

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];

            for (const record of records) {
                if (collHooks && collHooks.afterInsert) await collHooks.afterInsert(record);
            }
        }

        return records;
    }

    async insertMany<C extends keyof T>(collName: C, bodyArr: Omit<T[C], keyof CommonFields>[]): Promise<T[C][]> {
        return this.writeOpsQueue.enqueue(() => {
            return this.insertManyOp(collName, bodyArr);
        });
    }

    private async updateOp<C extends keyof T>(
        collName: C,
        id: RecordId,
        body: Partial<Omit<T[C], keyof CommonFields>>,
        opOpts: { overwriteObjectValues: boolean }
    ): Promise<T[C]> {
        this.preValidateBody(body);

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];
            if (collHooks && collHooks.beforeUpdate) await collHooks.beforeUpdate(id, body);
        }

        const row = this.sqlite.prepare(`
            SELECT collection_name, id, created_at, updated_at, body_json
            FROM records
            WHERE collection_name = ? AND id = ?
        `).get(String(collName), id) as SqlRecord | undefined;

        if (!row) {
            throw new Error(`record not found (id=${id})`);
        }

        const currentRecord = this.rowToRecord<C>(row);
        const updatedAt = this.getDateString();

        const updatedRecord = {
            ...currentRecord,
            updatedAt,
        } as T[C];

        if (opOpts.overwriteObjectValues) {
            Object.assign(updatedRecord as object, body);
        }
        else {
            deepMerge((updatedRecord as unknown) as {[key: string]: unknown}, (body as unknown) as {[key: string]: unknown});
        }

        this.sqlite.prepare(`
            UPDATE records
            SET updated_at = ?, body_json = ?
            WHERE collection_name = ? AND id = ?
        `).run(
            updatedAt,
            JSON.stringify(stripCommonFields((updatedRecord as unknown) as {[key: string]: unknown})),
            String(collName),
            id,
        );

        await this.persistAdapterSnapshot();

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];
            if (collHooks && collHooks.afterUpdate) await collHooks.afterUpdate(updatedRecord);
        }

        return updatedRecord;
    }

    async update<C extends keyof T>(
        collName: C,
        id: RecordId,
        body: Partial<Omit<T[C], keyof CommonFields>>,
        opOpts: { overwriteObjectValues: boolean } = { overwriteObjectValues: true }
    ): Promise<T[C]> {
        return this.writeOpsQueue.enqueue(() => {
            return this.updateOp(collName, id, body, opOpts);
        });
    }

    private async deleteOp<C extends keyof T>(collName: C, id: RecordId): Promise<T[C]> {
        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];
            if (collHooks && collHooks.beforeDelete) await collHooks.beforeDelete(id);
        }

        const row = this.sqlite.prepare(`
            SELECT collection_name, id, created_at, updated_at, body_json
            FROM records
            WHERE collection_name = ? AND id = ?
        `).get(String(collName), id) as SqlRecord | undefined;

        if (!row) {
            throw new Error(`record not found (id=${id})`);
        }

        const record = this.rowToRecord<C>(row);

        this.sqlite.prepare(`
            DELETE FROM records
            WHERE collection_name = ? AND id = ?
        `).run(String(collName), id);

        await this.persistAdapterSnapshot();

        if (this.opts.hooks && this.opts.hooks[collName]) {
            const collHooks = this.opts.hooks[collName];
            if (collHooks && collHooks.afterDelete) await collHooks.afterDelete(record);
        }

        return record;
    }

    async delete<C extends keyof T>(collName: C, id: RecordId): Promise<T[C]> {
        return this.writeOpsQueue.enqueue(() => {
            return this.deleteOp(collName, id);
        });
    }

    private async transactionOp<S>(cb: (tx: SqliteStore<T>) => S | Promise<S>): Promise<S> {
        const dataBefore = this.getFileContent();

        const txDb = new SqliteStore<T>({
            ...this.opts,
            adapter: new Adapters.Memory({
                db: JSON.stringify(dataBefore),
            }),
            collections: Object.keys(dataBefore.collections) as (keyof T & string)[],
        });

        const res = await cb(txDb);

        const dataAfter = await txDb.read();
        const countersAfter = (txDb as SqliteStore<T>).getFileContent().counters;

        this.importFileContent({
            counters: countersAfter,
            collections: dataAfter,
        } as FileContent<T>);

        await this.persistAdapterSnapshot();

        return res;
    }

    async transaction<S>(cb: (tx: SqliteStore<T>) => S | Promise<S>): Promise<S> {
        return this.writeOpsQueue.enqueue(() => {
            return this.transactionOp(cb);
        });
    }

    async clear() {
        const tx = this.sqlite.transaction(() => {
            this.sqlite.prepare('DELETE FROM records').run();
            this.sqlite.prepare('UPDATE collections SET counter = 0').run();
        });

        tx();

        await this.persistAdapterSnapshot();
    }

    close() {
        this.sqlite.close();
    }
}

