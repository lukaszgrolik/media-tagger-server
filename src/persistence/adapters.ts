export abstract class StorageAdapter {
    delay = 0;
}

export class Memory extends StorageAdapter {
    constructor(readonly opts?: { db?: string }) {
        super();

        if (opts?.db) {
            this.db = opts.db;
        }
    }

    db = '';
}

export class File extends StorageAdapter {
    constructor(readonly opts: { filePath: string }) {
        super();
    }
}

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export class LocalStorage extends StorageAdapter {
    private localStorage: StorageLike;

    constructor(readonly opts: { name: string, localStorage?: StorageLike }) {
        super();

        if (this.opts.localStorage === undefined) {
            throw new Error('localStorage adapter requires localStorage instance to be provided in opts');
        }

        this.localStorage = this.opts.localStorage;
    }

    getJsonText() {
        const val = this.localStorage.getItem(this.opts.name);
        if (val === null) throw new Error(`localStorage db does not exist under the key: ${this.opts.name}`);

        return val;
    }

    setJsonText(text: string) {
        return this.localStorage.setItem(this.opts.name, text);
    }
}
