import * as path from 'path';

export interface SystemPath {
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
}

export function systemPath(raw: string): SystemPath {
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

    return {
        raw,
        path: normalized,
        folder,
        folders,
        file,
        base,
        ext,
        extensions,
        fileExtPartial: `${base}${extensions.length > 1 ? '.' : ''}${extensions.slice(0, -1).join('.')}`,
        extLast: extensions.length ? extensions[extensions.length - 1] : '',
    };
}