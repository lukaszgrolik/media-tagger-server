import * as path from 'path';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import sharp from 'sharp';

import * as utils from '../utils';
import { systemPath, SystemPath } from '../system-path';

// type DestFilenameFn = (name: string, size: [number, number], ext: string, fullName: string) => string;
type DestFilenameFn = (name: string, size: number, ext: string, fullName: string) => string;

type GenerateSizeVariantFile = {
    src: SystemPath;
    destDir: SystemPath;
    // destFilename: DestFilenameFn;
    sizes: {
        maxHeight: number;
    }[];
};

export interface GenerateSizeVariantsOpts {
    files: GenerateSizeVariantFile[];
    // onFileProcessed?: (info: { src: SystemPath; sizes: { dest: SystemPath; size: [number, number] }[]; count: number; progress: number }) => void;
    onFileSucceeded?: (info: { src: SystemPath; sizes: { path: SystemPath; size: number }[]; count: number; progress: number }) => void;
    onFileError?: (info: { src: SystemPath; destDir: SystemPath; error: Error }) => void;
}

interface GeneratedSizeVariantsProcessedFile {
    src: SystemPath;
    sizes: {
        path: SystemPath;
        size: number;
    }[];
}

interface GenerateSizeVariantsResult {
    succeeded: GeneratedSizeVariantsProcessedFile[];
    failed: FailedOp[];
}

interface FailedOp {
    src: SystemPath;
    destDir: SystemPath;
    error: Error;
}

export async function generateImagesSizeVariants(opts: GenerateSizeVariantsOpts): Promise<GenerateSizeVariantsResult> {
    let processedCount = 0;
    const succeeded: GeneratedSizeVariantsProcessedFile[] = [];
    const failed: FailedOp[] = [];

    await utils.createMissingSubDirectories(opts.files.map(f => f.destDir.raw));

    async function processFile(file: GenerateSizeVariantFile) {
        let destFiles: GenerateImageSizeVariantsResult[] | undefined = undefined;

        try {
            destFiles = await generateImageSizeVariants({
                src: file.src,
                destDir: file.destDir,
                // destFilename: file.destFilename,
                sizes: file.sizes,
            });
        }
        catch (err) {
            failed.push({
                src: file.src,
                destDir: file.destDir,
                error: err as Error,
            });

            if (opts.onFileError) {
                await opts.onFileError({
                    src: file.src,
                    destDir: file.destDir,
                    error: err as Error,
                });
            }
        }

        if (destFiles) {
            // console.log('destFiles', destFiles)
            processedCount += 1;

            // const sizes = destFiles.map(f => f.size);

            succeeded.push({
                src: file.src,
                sizes: destFiles
            });

            const progress = processedCount / opts.files.length;

            if (opts.onFileSucceeded) {
                await opts.onFileSucceeded({
                    src: file.src,
                    sizes: destFiles,
                    count: processedCount,
                    progress,
                });
            }
        }
    }

    // await Promise.all(promises);

    for (const file of opts.files) {
        await processFile(file);
    }

    return {
        succeeded,
        failed,
    };
}

type GenerateImageSizeVariantsOpts = {
    src: SystemPath;
    destDir: SystemPath;
    // destFilename: DestFilenameFn;
    sizes: {
        maxHeight: number;
    }[];
};

type GenerateImageSizeVariantsResult = {
    path: SystemPath;
    size: number;
};

// class BetterPromise<T> extends Promise<T> {
//     static filter(promises: Promise<T>[]) {

//     }
// }

async function promiseFilter<T>(items: T[], cb: (item: T) => Promise<boolean>): Promise<T[]> {
    const filtered: T[] = [];

    const promises = items.map(item => {
        return cb(item);
    });

    const results = await Promise.all(promises);
    results.forEach((r, i) => {
        if (r) filtered.push(items[i]);
    });

    return filtered;
}

async function generateImageSizeVariants(opts: GenerateImageSizeVariantsOpts): Promise<GenerateImageSizeVariantsResult[]> {
    // @todo provide optional callback arg to utilize cached metadata height
    const validImages = await promiseFilter(opts.sizes, async size => {
        const metadataOrigin = await sharp(opts.src.path).metadata();

        // const inputW = 123;
        const inputH = metadataOrigin.height;

        if (!inputH) throw new Error(`Image height not found (${opts.src.path})`);

        return inputH > size.maxHeight;
    });

    async function processFile(size: {maxHeight: number}) {
        // const ratio = inputW / inputH;
        // const w = ratio * size.maxHeight;
        // const h = size.maxHeight;
        // const outputFileName = opts.destFilename(opts.src.base, size.maxHeight, opts.src.ext, opts.src.file);
        // const dest = path.join(opts.destDir.path, outputFileName);
        const dest = systemPath(path.join(opts.destDir.path, `${opts.src.fileExtPartial}_${size.maxHeight}.${opts.src.extLast}`));

        // NOTE: sharp fails silently if the destination folder doesn't exist
        await sharp(opts.src.path)
        .resize({height: size.maxHeight})
        .toFile(dest.path);

        return {
            path: dest,
            size: size.maxHeight
        };
    }

    // @todo promise-parallel-max or enqueue
    // return Promise.all(promises);

    const result: GenerateImageSizeVariantsResult[] = [];
    for (const file of validImages) {
        const res = await processFile(file);

        result.push(res);
    }

    return result;
}