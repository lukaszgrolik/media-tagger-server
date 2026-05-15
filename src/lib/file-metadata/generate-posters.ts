import * as path from 'path';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import 'mocha';
import sharp from 'sharp';

// var ffmpeg = require('fluent-ffmpeg');
import ffmpeg from 'fluent-ffmpeg';
import * as utils from '../utils';
import { systemPath, SystemPath } from '../system-path';

type FileError = { path: string; error: Error };
type FileSucceeded = { src: string; dest: string };

type GeneratePostersOptsFile = {
    src: SystemPath;
    destDir: SystemPath;
    // sizes: number[];
};

interface GeneratePostersOpts {
    files: GeneratePostersOptsFile[];
    onFileProcessed?: (
        err: FileError | undefined,
        file: FileSucceeded | undefined,
        progress: {count: number; progress: number; date: string}
    ) => void | Promise<void>;
    // onFileProcessed?: (info: { src: SystemPath; dest: SystemPath; count: number; progress: number }) => void;
    // onFileError?: (info: FailedOp) => void;
}

interface GeneratePostersResult {
    failed: FileError[];
    succeeded: FileSucceeded[];
}

interface FailedOp {
    src: SystemPath;
    destDir: SystemPath;
    error: Error;
}

export async function generatePosters(opts: GeneratePostersOpts): Promise<GeneratePostersResult> {
    // validate opts
    opts.files.forEach(file => {
        if (['mp4', 'webm'].includes(file.src.extLast.toLowerCase()) === false) {
            throw new Error(`invalid source file path - mp4 or webm file required ("${file.src.raw}" given)`);
        }

        if (!file.destDir) {
            throw new Error(`invalid destination dir path`);
        }
    });

    let processedCount = 0;
    const failed: FileError[] = [];
    const succeeded: FileSucceeded[] = [];

    await utils.createMissingSubDirectories(opts.files.map(f => f.destDir.raw));

    const genPoster = async (file: GeneratePostersOptsFile) => {
        let error: FileError | undefined = undefined;
        let fileRes: FileSucceeded | undefined = undefined;

        let destFile: SystemPath | undefined = undefined;

        try {
            destFile = await generatePoster({
                src: file.src,
                destDir: file.destDir,
            });

            fileRes = {
                src: file.src.raw,
                dest: destFile.raw,
            };

            succeeded.push(fileRes);
        }
        catch (err) {
            error = {
                path: file.src.raw,
                error: err as Error,
            };

            failed.push(error);
        }

        processedCount += 1;
        const progress = processedCount / opts.files.length;

        if (opts.onFileProcessed) {
            await opts.onFileProcessed(error, fileRes, {
                count: processedCount,
                progress,
                date: new Date().toISOString(),
            });
        }
    };

    //

    // process fully in parallel (strains server and creates errors)
    // await Promise.all(opts.files.map(genPoster));

    // process in sequence
    for (const file of opts.files) {
        await genPoster(file);
    }

    // @todo process in parallel with chunks - e.g. 8 videos in parallel

    return {
        succeeded,
        failed,
    };
}

async function generatePoster(opts: { src: SystemPath; destDir: SystemPath }): Promise<SystemPath> {
    try {
        // will throw if file not found
        await fs.promises.access(opts.src.raw);
    }
    catch (err) {
        throw new Error(`file not found: "${opts.src.raw}"`);
    }

    // here it throws cryptic error later in ffmpeg call if all the folders are not created beforehand but one at the time
    // // ensure output folder exists
    // await fsExtra.mkdirp(opts.destDir.folder);

    await new Promise((resolve, reject) => {
        ffmpeg({
            source: opts.src.raw,
        })
            .takeScreenshots({
                timemarks: [0],
                folder: opts.destDir.raw,
                // filename: '%b_poster.png'
                filename: '%b.png',
            })
            .on('error', err => {
                reject(err);
            })
            .on('end', () => {
                resolve(null);
            });
    });

    // ffmpeg outputs png file
    const posterPath = `${opts.destDir.path}/${opts.src.fileExtPartial}.png`;

    const dest = systemPath(path.join(opts.destDir.path, `${opts.src.fileExtPartial}_poster.jpg`));

    await sharp(posterPath)
        .jpeg()
        .toFile(dest.path);

    await fs.promises.unlink(posterPath);

    return dest;
}