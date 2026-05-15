import * as fs from 'fs';
import * as path from 'path';

import { Adapters, SqliteStore } from './persistence/sqlite-store';
import { DatabaseSchema } from './types';

function parseArgs(argv: string[]) {
    const args = {
        dir: '',
        file: '',
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--dir') {
            args.dir = argv[i + 1] || '';
            i += 1;
            continue;
        }

        if (arg === '--file') {
            args.file = argv[i + 1] || '';
            i += 1;
            continue;
        }

        if (arg.startsWith('-') === false && !args.dir && !args.file) {
            args.dir = arg;
        }
    }

    return args;
}

function toSqlitePath(sourcePath: string) {
    if (sourcePath.toLowerCase().endsWith('.json')) {
        return sourcePath.replace(/\.json$/i, '.sqlite');
    }

    return `${sourcePath}.sqlite`;
}

function getSourceFiles(args: {dir: string; file: string}) {
    if (args.file) {
        const filePath = path.resolve(args.file);
        if (fs.existsSync(filePath) === false) {
            throw new Error(`File does not exist: ${filePath}`);
        }

        return [filePath];
    }

    if (!args.dir) {
        throw new Error('Missing argument. Use --dir <directory> or --file <path>.');
    }

    const dirPath = path.resolve(args.dir);
    if (fs.existsSync(dirPath) === false) {
        throw new Error(`Directory does not exist: ${dirPath}`);
    }

    return fs.readdirSync(dirPath)
        .filter((name: string) => name.toLowerCase().endsWith('.media-tagger.json'))
        .map((name: string) => path.join(dirPath, name));
}

async function migrateOne(sourcePath: string) {
    const sqlitePath = toSqlitePath(sourcePath);

    const db = new SqliteStore<DatabaseSchema>({
        adapter: new Adapters.File({ filePath: sourcePath }),
        collections: ['files', 'tags'],
    });

    const data = await db.read();

    return {
        sourcePath,
        sqlitePath,
        filesCount: data.files.length,
        tagsCount: data.tags.length,
    };
}

(async () => {
    const args = parseArgs(process.argv.slice(2));
    const sourceFiles = getSourceFiles(args);

    if (sourceFiles.length === 0) {
        console.log('No source JSON files found.');
        return;
    }

    console.log(`Found ${sourceFiles.length} source files.`);

    for (const sourcePath of sourceFiles) {
        const res = await migrateOne(sourcePath);

        console.log(`Migrated: ${res.sourcePath}`);
        console.log(`  -> ${res.sqlitePath}`);
        console.log(`  tags=${res.tagsCount}, files=${res.filesCount}`);
    }
})();
