import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';
// import * as imagemin from "imagemin";
// import imageminPngquant, { Options as ImageminPngquantOptions } from "imagemin-pngquant";

import { ProcessFileFn, ProcessFileFnOptions } from './generate-thumbnails';
import { generateImageSizeVariants } from './generate-image-size-variants';

// @todo create folders
// @todo use stream to create two sizes (?)
// @todo orig->720 diff, 720-300 diff, mb saved by compression

// console.log('__dirname', __dirname);

// const imageBaseHeight = 720;
// const imageSquareSize = 300;

const THUMBNAIL_SIZES = [720, 360, 180, 90];

export const processImageFile: ProcessFileFn = async ({entry, options}) => {


    const fileSharp = sharp(entry);
    const imageMetadata = await fileSharp.metadata();

    await generateImageSizeVariants({
        imagePath: entry,
        outputFolder: options.,
        imageSize: { width: imageMetadata.width, height: imageMetadata.height },
        sizes: THUMBNAIL_SIZES,
    });
    // onFileProcessed(entry, fileRelativePath, sizes);
}

// export async function processImageFiles(projectConfig: ConfigProject, entries: string[], onFileProcessed: (entry: string, fileRelativePath: string) => void) {
// export const processImageFiles: FileProcessFn = async ({options, entries, onFileProcessed}) => {
//     // @todo perf
//     // for (const entry of entries) {
//     //     await processImageFile(entry, opts, onFileProcessed);
//     // }

//     const promises = entries.map(e => {
//         return processImageFile(e, options, onFileProcessed);
//     });

//     await Promise.all(promises);
// }