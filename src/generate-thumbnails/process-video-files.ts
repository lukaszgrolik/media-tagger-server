import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';

import { FileProcessFn, ProcessFileFnOptions } from "./generate-thumbnails";

const createdFileFolders: string[] = [];

export const processVideoFile: FileProcessFn = async ({entry, options}) => {
    // const fileExtMatch = entry.match(/[^\.]+$/)
    // if (!fileExtMatch) throw new Error(`file extension not detected: ${entry}`);

    // const fileExt = fileExtMatch[0].toLowerCase();

    // const fileRelativePath = path.resolve(entry).replace(path.resolve(opts.path), '');
    // const outputPath = path.join(opts.thumbnailsOutput, fileRelativePath);
    // const outputFolderPath = path.dirname(outputPath);

    // if (createdFileFolders.includes(outputFolderPath) === false) {
    //     await fs.promises.mkdir(outputFolderPath, { recursive: true });
    //     createdFileFolders.push(outputFolderPath);
    // }

    const fileSharp = sharp(entry);
    const imageMetadata = await fileSharp.metadata();
    const sizes = options.sizes
        .filter(size => {
            if (!imageMetadata.height) throw new Error(`height not defined for file: ${entry}`);

            return size < imageMetadata.height;
        });

    const imageSizesPromises = sizes.map(size => {
        const sizeVariantOutputPath = outputPath.replace(/(\..+)$/, (_, ext) => `_${size}${ext}`);

        return generateImage({
            fileSharp,
            fileExt,
            height: size,
            outputPath: sizeVariantOutputPath,
            outputFolderPath,
        });
    });

    await Promise.all(imageSizesPromises);

    // onFileProcessed(entry, fileRelativePath, sizes);
}

// export const processVideoFiles: FileProcessFn = async ({options, entries, onFileProcessed}) => {
//     const promises = entries.map(e => {
//         return processVideoFile(e, options, onFileProcessed);
//     });

//     await Promise.all(promises);
// }