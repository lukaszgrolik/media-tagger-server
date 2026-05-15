import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import should = require('should');
import * as sharp from 'sharp';

// var ffmpeg = require('fluent-ffmpeg');
import * as ffmpeg from 'fluent-ffmpeg';
import { systemPath as systemPath, SystemPath } from '../src/lib/system-path';
import { generatePosters } from '../src/actions/generate-posters';

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
            displaySize: undefined | [number, number];
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