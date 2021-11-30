import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';
import * as sharp from 'sharp';

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

function getFilesMetadataStatus(): {}[] {

}

const FILE_TYPE_VIDEO = ['mp4', 'webm'];
const FILE_TYPE_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

async function updateMetadata(opts: Opts): Promise<void> {
    const db: Db = {files: []};

    for (const file of db.files) {
        // @todo
        const fileExt = file.path;
        const fileIsVideo = FILE_TYPE_VIDEO.includes(fileExt);

        if (file.meta.size === undefined) {

        }

        if (file.meta.poster === undefined) {
            if (!fileIsVideo) {
                file.meta.poster = null;
            }
            else {

            }
        }

        if (file.meta.thumbnails === undefined) {
            if (!fileIsVideo) {

            }
            else {

            }
        }
    }

    return;
}

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
    export interface Opts {
        files: {
            src: string;
            destDir: string;
            destFilename: (name: string, size: string, ext: string, fullName: string) => string,
            sizes: {maxHeight: number}[];
        }[];
    }

    export interface Result {
        files: {
            src: string;
            dest: string;
            sizes: [number, number][];
        }[];
    }

    export async function generateSizeVariants(opts: Opts): Promise<Result> {
        return {files: []};
    }
}

namespace VideoPosters {
    export interface Opts {
        files: {
            src: string;
            dest: string;
            // sizes: number[];
        }[];
    }

    export async function generatePosters(opts: Opts): Promise<void> {
        return;
    }
}

describe('generate-thumbnails', () => {
    describe('generatePosters', () => {
        it('throws if files array contains file with empty src');
        it('throws if files array contains file with empty dest');
        // it('throws if files array contains file with empty sizes array');

        it('throws if file not found');

        it('generates poster image for a mp4 file', async () => {
            const opts = {
                files: [
                    {
                        src: '',
                        dest: '',
                        // sizes: [],
                    }
                ],
            };

            await VideoPosters.generatePosters(opts);

            await fs.promises.stat(opts.files[0].dest);
        });

        it('generates poster image for a webm file');
    });

    describe('generateSizeVariants', () => {
        it('throws if files array contains file with empty src');
        it('throws if files array contains file with empty dest');
        it('throws if files array contains file with empty sizes array');

        it('throws if file not found');

        it('generates thumbnail size variants for a jpg image', async () => {
            const opts: SizeVariants.Opts = {
                files: [
                    {
                        src: '',
                        destDir: '',
                        destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
                        sizes: [{maxHeight: 100}],
                    }
                ],
            };

            const metadataOrigin = await sharp(opts.files[0].src).metadata();
            const sizeRatio = metadataOrigin.width / metadataOrigin.height;

            const res = await SizeVariants.generateSizeVariants(opts);

            const metadataCopy = await sharp(res.files[0].dest).metadata();

            should(metadataCopy.height).equal(100);
            should(metadataCopy.width).equal(100 * sizeRatio);
        });

        it('generates thumbnail size variants for a png image');
        it('generates thumbnail size variants for a gif image');
        it('generates thumbnail size variants for a webp image');

        it('does not generate thumbnails larger than source image', async () => {
            const opts: SizeVariants.Opts = {
                files: [
                    {
                        src: '',
                        destDir: '',
                        destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
                        sizes: [{maxHeight: 100}],
                    }
                ],
            };

            const metadataOrigin = await sharp(opts.files[0].src).metadata();

            const res = await SizeVariants.generateSizeVariants(opts);

            // const metadataCopy = await sharp(opts.files[0].dest).metadata();

            // @todo should not exist
            await fs.promises.stat(res.files[0].dest);

            // should(metadataCopy.height).equal(metadataOrigin.height);
            // should(metadataCopy.width).equal(metadataOrigin.width);
        });
    });

    describe('generateThumbnails', () => {
        describe('options validation', () => {
            it('throws if invalid sourceDir path given', async () => {
                await updateMetadata({
                    sourceDir: '',
                    outputDir: '',
                    thumbnailSizes: [],
                    dbFile: '',
                });
            });

            // it('throws if empty files array given', async () => {
            //     await generateThumbnails({
            //         sourceDir: '',
            //         outputDir: '',
            //         thumbnailSizes: [],
            //         dbFile: '',
            //     });
            // });

            it('throws if invalid outputDir given', async () => {
                await updateMetadata({
                    sourceDir: '',
                    outputDir: '',
                    thumbnailSizes: [],
                    dbFile: '',
                });
            });

            it('throws if empty thumbnailSizes array given', async () => {
                await updateMetadata({
                    sourceDir: '',
                    outputDir: '',
                    thumbnailSizes: [],
                    dbFile: '',
                });
            });

            it('throws if invalid dbFile given', async () => {
                await updateMetadata({
                    sourceDir: '',
                    files: [],
                    outputDir: '',
                    thumbnailSizes: [],
                    dbFile: '',
                });
            });
        });

        it('detects source files');
        it('outputs under correct destination path');

        it('saves generated poster paths to file');
        it('saves generated thumbnail paths to file');
        it('loads generated thumbnail paths from file and processes only new files');
        it('removes thumbnails of source files that no longer exist')
    });
});