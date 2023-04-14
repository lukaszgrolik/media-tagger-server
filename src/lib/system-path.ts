import * as path from 'path';

export function systemPath(raw: string) {
    return new SystemPath(raw);
}

export class SystemPath {
    raw: string;
    path: string;
    folder: string;
    folders: string[];
    file: string;
    base: string;
    ext: string;
    extensions: string[];
    fileExtPartial: string;
    extLast: string;

    constructor(raw: string) {
        const normalized = raw.replace(/\\/g, '/');
        const folder = (() => {
            // slash at the end
            if (normalized[normalized.length - 1] === '/') return normalized.slice(0, -1);

            // slash in the middle
            if (normalized.includes('/')) return path.dirname(normalized);

            return '';
        })();
        const folders = folder ? folder.split('/') : [];
        const file = normalized.replace(folder, '').replace('/', '');
        const fileParts = file.split('.');
        const base = fileParts[0];
        const extensions = fileParts.slice(1);
        const ext = extensions.join('.');

        this.raw = raw;
        this.path = normalized;
        this.folder = folder;
        this.folders = folders;
        this.file = file;
        this.base = base;
        this.ext = ext;
        this.extensions = extensions;
        this.fileExtPartial = `${base}${extensions.length > 1 ? '.' : ''}${extensions.slice(0, -1).join('.')}`;
        this.extLast = extensions.length ? extensions[extensions.length - 1] : '';
    }

    toString() {
        return this.path;
    }
}