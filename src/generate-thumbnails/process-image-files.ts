import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';
// import * as imagemin from "imagemin";
// import imageminPngquant, { Options as ImageminPngquantOptions } from "imagemin-pngquant";

import { FileProcessCb, FileProcessFn, FileProcessOpts } from './generate-thumbnails';

// @todo create folders
// @todo use stream to create two sizes (?)
// @todo orig->720 diff, 720-300 diff, mb saved by compression

// console.log('__dirname', __dirname);

// const imageBaseHeight = 720;
// const imageSquareSize = 300;

const sharpPngConfig = {
    // compressionLevel: 9,
    // adaptiveFiltering: true,
    // force: false,
    // quality: 60,
};
const sharpJpgConfig = {
    quality: 60,
    // force: false,
};
const sharpPngToJpgConfig = {
    quality: 80,
    // force: false,
};
// const imageminPnqquantConfig: ImageminPngquantOptions = {
//     quality: [.5, .97]
// };

// type FileExt = 'jpg' | 'jpeg' | 'png' | 'gif' | 'svg' | 'webp';

const matchFileExt = async (fileExt: string, opts: { [key in 'jpg' | 'png' | 'gif' | 'webp']: () => unknown | Promise<unknown> }) => {
    if (fileExt === 'png') {
        if (!opts.png) throw new Error('png callback is undefined');
        await opts.png();
    }
    else if (fileExt === 'jpg' || fileExt === 'jpeg') {
        if (!opts.jpg) throw new Error('jpg callback is undefined');
        await opts.jpg();
    }
    else {
        throw new Error(`unsupported file extension: ${fileExt}`);
    }
};

const generateImage = async (opts: { entry: string, fileExt: string, height: number, outputPath: string, outputFolderPath: string }) => {
    // create smaller version (720p) - scale
    const sharpResized = sharp(opts.entry).resize({ height: opts.height });

    matchFileExt(opts.fileExt, {
        png: () => {
            sharpResized.png(sharpPngConfig);
        },
        jpg: () => {
            sharpResized.jpeg(sharpJpgConfig);
        },
        gif: () => {
            sharpResized.gif();
        },
        webp: () => {
            sharpResized.webp();
        },
    });

    await sharpResized.toFile(opts.outputPath);

    // await sharp(entry)
    //     .resize({ height: imageBaseHeight })
    //     .jpeg(sharpPngToJpgConfig)
    //     .toFile(outputPath.replace(/(\..+)$/, (_, ext) => `.jpg`));

    // await sharp(entry)
    // .resize({height: imageBaseHeight})
    // .webp()
    // .toFile(outputPath.replace(/(\..+)$/, (_, ext) => `.webp`));

    // const info = await sharp(entry).metadata();
    // const height = info.height;
    // if (!height) throw new Error('invalid height');
    // const width = info.width;
    // if (!width) throw new Error('invalid width');

    // const smallerSide = Math.min(width, height);
    // const sideDiff = Math.abs(width - height);

    // const extractConfig = {
    //     width: smallerSide,
    //     height: smallerSide,
    //     ...((width >= height) ? {
    //         left: Math.round(sideDiff / 2),
    //         top: 0,
    //     } : {
    //         left: 0,
    //         top: Math.round(sideDiff / 2),
    //     }),
    // };

    // const sharpSquare = sharp(entry)
    //     .extract(extractConfig)
    //     .resize({ width: imageSquareSize, height: imageSquareSize })

    // checkFileExt({
    //     png: () => {
    //         sharpSquare.png(sharpPngConfig)
    //     },
    //     jpg: () => {
    //         sharpSquare.jpeg(sharpJpgConfig)
    //     },
    // });

    // await sharpSquare.toFile(squareOutputPath);

    // await sharp(entry)
    //     .extract({ top: 0, height, width: height, left: Math.round((width - height) / 2) })
    //     .resize({ height: imageSquareSize })
    //     .jpeg(sharpPngToJpgConfig)
    //     .toFile(outputPath.replace(/(\..+)$/, (_, ext) => `_square.jpg`));

    // await sharp(entry)
    // .extract({top: 0, height, width: height, left: Math.round((width - height) / 2)})
    // .resize({ height: imageSquareSize })
    // .webp()
    // .toFile(outputPath.replace(/(\..+)$/, (_, ext) => `_square.webp`));

    if (opts.fileExt === 'png') {
        // @todo perf - stream sharp->imagemin
        // const files = await imagemin([outputPath, squareOutputPath], {
        // const files = await imagemin([opts.outputPath], {
        //     // destination: "compressed-images",
        //     destination: opts.outputFolderPath,
        //     plugins: [
        //         imageminPngquant(imageminPnqquantConfig),
        //     ],
        // });
    }
};

const processImageFile = async (entry: string, opts: FileProcessOpts, onFileProcessed: FileProcessCb) => {
    // console.log('entry', entry)
    // console.log('opts.path', opts.path)
    const fileExtMatch = entry.match(/[^\.]+$/)
    if (!fileExtMatch) throw new Error(`file extension not detected: ${entry}`);

    const fileExt = fileExtMatch[0].toLowerCase();
    // if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) === false) throw new Error(`unsupported file extension: ${fileExt}`);

    const fileRelativePath = path.resolve(entry).replace(path.resolve(opts.path), '');
    // console.log('fileRelativePath', fileRelativePath)
    const outputPath = path.join(opts.thumbnailsOutput, fileRelativePath);
    // console.log('outputPath', outputPath)
    // const squareOutputPath = outputPath.replace(/(\..+)$/, (_, ext) => `_square${ext}`);
    const outputFolderPath = path.dirname(outputPath);
    // console.log('outputPath', outputPath)

    await fs.promises.mkdir(outputFolderPath, { recursive: true });

    const imageSizesPromises = opts.sizes.map(size => {
        const sizeVariantOutputPath = outputPath.replace(/(\..+)$/, (_, ext) => `_${size}${ext}`);

        return generateImage({
            entry,
            fileExt,
            height: size,
            outputPath: sizeVariantOutputPath,
            outputFolderPath,
        });
    });

    await Promise.all(imageSizesPromises);

    onFileProcessed(entry, fileRelativePath);
}

// export async function processImageFiles(projectConfig: ConfigProject, entries: string[], onFileProcessed: (entry: string, fileRelativePath: string) => void) {
export const processImageFiles: FileProcessFn = async (opts, entries, onFileProcessed) => {
    // @todo perf
    // for (const entry of entries) {
    //     await processImageFile(entry, opts, onFileProcessed);
    // }

    const promises = entries.map(e => {
        return processImageFile(e, opts, onFileProcessed);
    });

    await Promise.all(promises);
}