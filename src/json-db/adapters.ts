import * as path from 'path'
import * as fs from 'fs'

import { JsonDbAdapter } from "./json-db";

export namespace Adapters {
    export class Memory extends JsonDbAdapter {
        constructor(readonly opts?: { db?: string }) {
            super();

            if (opts?.db) this.db = opts.db;
        }

        db = '';
        delay = 0;

        read() {
            return this.db;
        }

        write(text: string): void | Promise<void> {
            const updateDb = () => this.db = text;

            if (this.delay === 0) {
                updateDb();
                return;
            }

            return new Promise(res => {
                setTimeout(() => {
                    updateDb();

                    res();
                }, this.delay);
            });
        }
    }

    export class File extends JsonDbAdapter {
        constructor(readonly opts: { filePath: string }) {
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

        constructor(readonly opts: { name: string, localStorage?: LSLike }) {
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