import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';
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
    onFileProcessed?: (info: { src: SystemPath; sizes: { path: SystemPath; size: number }[]; count: number; progress: number }) => void;
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
    processed: GeneratedSizeVariantsProcessedFile[];
    failed: FailedOp[];
}

interface FailedOp {
    src: SystemPath;
    destDir: SystemPath;
    error: Error;
}

export async function generateImagesSizeVariants(opts: GenerateSizeVariantsOpts): Promise<GenerateSizeVariantsResult> {
    let processedCount = 0;
    const processed: GeneratedSizeVariantsProcessedFile[] = [];
    const failed: FailedOp[] = [];

    const promises = opts.files.map(async file => {
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
                error: err,
            });

            if (opts.onFileError) {
                opts.onFileError({
                    src: file.src,
                    destDir: file.destDir,
                    error: err,
                });
            }
        }

        if (destFiles) {
            // console.log('destFiles', destFiles)
            processedCount += 1;

            // const sizes = destFiles.map(f => f.size);

            processed.push({
                src: file.src,
                sizes: destFiles
            });

            const progress = processedCount / opts.files.length;

            if (opts.onFileProcessed) {
                opts.onFileProcessed({
                    src: file.src,
                    sizes: destFiles,
                    count: processedCount,
                    progress,
                });
            }
        }
    });

    await Promise.all(promises);

    return {
        processed,
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

    const promises = validImages.map(async size => {
        // const ratio = inputW / inputH;
        // const w = ratio * size.maxHeight;
        // const h = size.maxHeight;
        // const outputFileName = opts.destFilename(opts.src.base, size.maxHeight, opts.src.ext, opts.src.file);
        // const dest = path.join(opts.destDir.path, outputFileName);
        const dest = systemPath(path.join(opts.destDir.path, `${opts.src.fileExtPartial}_${size.maxHeight}.${opts.src.extLast}`));

        await sharp(opts.src.path)
            .resize({height: size.maxHeight})
            .toFile(dest.path);

        return {
            path: dest,
            size: size.maxHeight
        };
    });

    // @todo promise-parallel-max or enqueue
    return Promise.all(promises);
}