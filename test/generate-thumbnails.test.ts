import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';
import * as sharp from 'sharp';

// var ffmpeg = require('fluent-ffmpeg');
import * as ffmpeg from 'fluent-ffmpeg';
import { systemPath as systemPath, SystemPath } from '../src/lib/system-path';

async function removeDirContents(dirPath: string) {
    const files = await fs.promises.readdir(dirPath)
    const promises = files.map(file => {
        return fs.promises.unlink(path.join(dirPath, file));
    });

    return Promise.all(promises);
}

interface Db {
    files: {
        id: number;
        path: string;
        description: string;
        tagsIds: number[];
        //
        meta: {
            // hash: string;
            mtime: number;
            fileSize: number;
            imageSize: undefined | [number, number];
            poster: undefined | null | string;
            thumbnails: undefined | {
                path: string;
                size: [number, number];
            }[];
        };
    }[];
}

interface Opts {
    sourceDir: string;
    files?: string[];
    outputDir: string;
    thumbnailSizes: number[];
    dbFile: string;
}

// function getFilesMetadataStatus(): {}[] {

// }

const FILE_TYPE_VIDEO = ['mp4', 'webm'];
const FILE_TYPE_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// async function updateMetadata(opts: Opts): Promise<void> {
//     const db: Db = {files: []};

//     for (const file of db.files) {
//         // @todo
//         const fileExt = file.path;
//         const fileIsVideo = FILE_TYPE_VIDEO.includes(fileExt);

//         if (file.meta.size === undefined) {

//         }

//         if (file.meta.poster === undefined) {
//             if (!fileIsVideo) {
//                 file.meta.poster = null;
//             }
//             else {

//             }
//         }

//         if (file.meta.thumbnails === undefined) {
//             if (!fileIsVideo) {

//             }
//             else {

//             }
//         }
//     }

//     return;
// }

function clearMetadata() {

}

function watchFilesOnDisk() {
    // update metadata if:
    // new files appear
    // thumbnailSizes settings change

    // watch new videos to add posters
    // watch new images to add thumbnails
    // watch file rename?
    // watch deleted files to delete entry from db OR to warn about file record without file on disk
}

namespace FilesMetadata {
    export interface Opts {
        files: string[];
        posters: {
            destDir: string | ((origDir: string) => string);
            destFilename: (name: string, size: string, ext: string, fullName: string) => string;
        },
        thumbnails: {
            destDir: string | ((origDir: string) => string);
            destFilename: (name: string, size: string, ext: string, fullName: string) => string;
            sizes: { maxHeight: number }[];
        };
    }

    export async function updateMetadata(opts: Opts): Promise<void> {


        return;
    }
}

namespace SizeVariants {

}



describe('generate-thumbnails', () => {

    interface GeneratePostersOpts {
        files: {
            src: SystemPath;
            destDir: SystemPath;
            // sizes: number[];
        }[];
        onFileProcessed?: (info: {src: SystemPath; dest: SystemPath; count: number; progress: number}) => void;
        onFileError?: (info: {src: SystemPath; destDir: SystemPath; error: Error}) => void;
    }

    interface GeneratePostersResult {
        processed: SystemPath[];
        failed: FailedOp[];
    }

    interface FailedOp {
        src: SystemPath;
        destDir: SystemPath;
        error: Error;
    }

    async function generatePosters(opts: GeneratePostersOpts): Promise<GeneratePostersResult> {
        let processedCount = 0;
        const processed: SystemPath[] = [];
        const failed: FailedOp[] = [];

        await Promise.all(
            opts.files.map(async file => {
                let destFile: SystemPath | undefined = undefined;

                try {
                    destFile = await generatePoster({src: file.src, destDir: file.destDir});
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

                processedCount += 1;

                if (destFile) {
                    processed.push(destFile);

                    const progress = processedCount / opts.files.length;

                    if (opts.onFileProcessed) {
                        opts.onFileProcessed({
                            src: file.src,
                            dest: destFile,
                            count: processedCount,
                            progress,
                        });
                    }
                }
            })
        );

        return {
            processed,
            failed,
        };
    }

    async function generatePoster(opts: {src: SystemPath; destDir: SystemPath}): Promise<SystemPath> {
        await new Promise((resolve, reject) => {
            ffmpeg({
                source: opts.src.path,
            })
            .takeScreenshots({
                timemarks: [0],
                folder: opts.destDir.path,
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

        const poster = `${opts.destDir.path}/${opts.src.fileExtPartial}.png`;
        const dest = systemPath(`${opts.destDir.path}/${opts.src.fileExtPartial}_poster.jpg`);

        await sharp(poster)
        .jpeg()
        .toFile(dest.path);

        await fs.promises.unlink(poster);

        return dest;
    }

    describe('generatePosters', () => {
        afterEach(async () => {
            await removeDirContents(path.resolve(__dirname, 'output-files'));
        });

        it('throws if files array contains file with empty src');
        it('throws if files array contains file with empty dest');
        // it('throws if files array contains file with empty sizes array');

        it('throws if file not found');

        it('generates poster image for a mp4 file', async () => {
            const opts = {
                files: [
                    {
                        src: systemPath(path.resolve(__dirname, 'source-files/starfish.mp4')),
                        destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                        // sizes: [],
                    }
                ],
            };

            const res = await generatePosters(opts);

            if (res.failed.length) {
                throw res.failed[0].error;
            }

            should(res.processed.length).equal(1);

            // will throw if file not found
            // await fs.promises.access(res.processed[0].path);
            // await fs.promises.access(path.resolve(__dirname, 'output-files/test_1_poster.jpg'));

            // ensure it doesn't output other files
            const files = await fs.promises.readdir(path.resolve(__dirname, 'output-files/'));

            should(files).deepEqual([
                'starfish_poster.jpg'
            ]);
        });

        it('generates poster images for mutliple mp4 files');

        it('generates poster image for a webm file');
    });

    interface GenerateSizeVariantsOpts {
        files: {
            src: string;
            destDir: string;
            destFilename: (name: string, size: string, ext: string, fullName: string) => string,
            sizes: { maxHeight: number }[];
        }[];
    }

    interface GenerateSizeVariantsOptsResult {
        files: {
            src: string;
            dest: string;
            sizes: [number, number][];
        }[];
    }

    async function generateSizeVariants(opts: GenerateSizeVariantsOpts): Promise<GenerateSizeVariantsOptsResult> {
        return { files: [] };
    }

    describe('generateSizeVariants', () => {
        // it('throws if files array contains file with empty src');
        // it('throws if files array contains file with empty dest');
        // it('throws if files array contains file with empty sizes array');

        // it('throws if file not found');

        // it('generates thumbnail size variants for a jpg image', async () => {
        //     const opts: SizeVariants.Opts = {
        //         files: [
        //             {
        //                 src: '',
        //                 destDir: '',
        //                 destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
        //                 sizes: [{maxHeight: 100}],
        //             }
        //         ],
        //     };

        //     const metadataOrigin = await sharp(opts.files[0].src).metadata();
        //     const sizeRatio = metadataOrigin.width / metadataOrigin.height;

        //     const res = await SizeVariants.generateSizeVariants(opts);

        //     const metadataCopy = await sharp(res.files[0].dest).metadata();

        //     should(metadataCopy.height).equal(100);
        //     should(metadataCopy.width).equal(100 * sizeRatio);
        // });

        // it('generates thumbnail size variants for a png image');
        // it('generates thumbnail size variants for a gif image');
        // it('generates thumbnail size variants for a webp image');

        // it('does not generate thumbnails larger than source image', async () => {
        //     const opts: SizeVariants.Opts = {
        //         files: [
        //             {
        //                 src: '',
        //                 destDir: '',
        //                 destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
        //                 sizes: [{maxHeight: 100}],
        //             }
        //         ],
        //     };

        //     const metadataOrigin = await sharp(opts.files[0].src).metadata();

        //     const res = await SizeVariants.generateSizeVariants(opts);

        //     // const metadataCopy = await sharp(opts.files[0].dest).metadata();

        //     // @todo should not exist
        //     await fs.promises.stat(res.files[0].dest);

        //     // should(metadataCopy.height).equal(metadataOrigin.height);
        //     // should(metadataCopy.width).equal(metadataOrigin.width);
        // });
    });

    describe('generateThumbnails', () => {
    //     describe('options validation', () => {
    //         it('throws if invalid sourceDir path given', async () => {
    //             await updateMetadata({
    //                 sourceDir: '',
    //                 outputDir: '',
    //                 thumbnailSizes: [],
    //                 dbFile: '',
    //             });
    //         });

    //         // it('throws if empty files array given', async () => {
    //         //     await generateThumbnails({
    //         //         sourceDir: '',
    //         //         outputDir: '',
    //         //         thumbnailSizes: [],
    //         //         dbFile: '',
    //         //     });
    //         // });

    //         it('throws if invalid outputDir given', async () => {
    //             await updateMetadata({
    //                 sourceDir: '',
    //                 outputDir: '',
    //                 thumbnailSizes: [],
    //                 dbFile: '',
    //             });
    //         });

    //         it('throws if empty thumbnailSizes array given', async () => {
    //             await updateMetadata({
    //                 sourceDir: '',
    //                 outputDir: '',
    //                 thumbnailSizes: [],
    //                 dbFile: '',
    //             });
    //         });

    //         it('throws if invalid dbFile given', async () => {
    //             await updateMetadata({
    //                 sourceDir: '',
    //                 files: [],
    //                 outputDir: '',
    //                 thumbnailSizes: [],
    //                 dbFile: '',
    //             });
    //         });
    //     });

    //     it('detects source files');
    //     it('outputs under correct destination path');

    //     it('saves generated poster paths to file');
    //     it('saves generated thumbnail paths to file');
    //     it('loads generated thumbnail paths from file and processes only new files');
    //     it('removes thumbnails of source files that no longer exist')
    });
});