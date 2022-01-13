import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';
import { systemPath, SystemPath } from '../system-path';

type DestFilenameFn = (name: string, size: [number, number], ext: string, fullName: string) => string;

export interface GenerateSizeVariantsOpts {
    files: {
        src: SystemPath;
        destDir: SystemPath;
        destFilename: DestFilenameFn,
        sizes: { maxHeight: number }[];
    }[];
    onFileProcessed?: (info: { src: SystemPath; sizes: { dest: SystemPath; size: [number, number] }[]; count: number; progress: number }) => void;
    onFileError?: (info: { src: SystemPath; destDir: SystemPath; error: Error }) => void;
}

interface GeneratedSizeVariantsProcessedFile {
    src: SystemPath;
    sizes: {
        dest: SystemPath;
        size: [number, number];
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
        let destFiles: SystemPath[] | undefined = undefined;

        try {
            destFiles = await generateImageSizeVariants({
                src: file.src,
                destDir: file.destDir,
                destFilename: file.destFilename,
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
            processedCount += 1;

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

async function generateImageSizeVariants(opts: { src: SystemPath; destDir: SystemPath; destFilename: DestFilenameFn; sizes: [number, number][] }): Promise<SystemPath[]> {
    const promises = opts.sizes.map(async size => {
        const dest = path.join(opts.destDir.path, opts.destFilename(opts.src.base, [1, 2], opts.src.ext, opts.src.file));

        await sharp(opts.src.path)
            .resize()
            .toFile(dest);
    });

    await Promise.all(promises);

    return systemPath();
}