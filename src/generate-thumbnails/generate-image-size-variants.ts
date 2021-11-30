import * as sharp from 'sharp';

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

type MatchFileExtOpts = Record<'jpg' | 'png' | 'gif' | 'webp', () => unknown | Promise<unknown>>;

const matchFileExt = async (fileExt: string, opts: MatchFileExtOpts) => {
    if (fileExt === 'png') {
        if (!opts.png) throw new Error('png callback is undefined');
        await opts.png();
    }
    else if (fileExt === 'jpg' || fileExt === 'jpeg') {
        if (!opts.jpg) throw new Error('jpg callback is undefined');
        await opts.jpg();
    }
    else if (fileExt === 'gif') {
        if (!opts.gif) throw new Error('gif callback is undefined');
        await opts.gif();
    }
    else if (fileExt === 'webp') {
        if (!opts.webp) throw new Error('webp callback is undefined');
        await opts.webp();
    }
    else {
        throw new Error(`unsupported file extension: ${fileExt}`);
    }
};

const generateImage = async (opts: { fileSharp: sharp.Sharp, fileExt: string, height: number, outputPath: string }) => {
    // @todo fix "GIF output requires libvips with support for ImageMagick"
    if (opts.fileExt === 'gif') return;

    // create smaller version (720p) - scale
    const sharpResized = opts.fileSharp.resize({ height: opts.height });

    matchFileExt(opts.fileExt, {
        png: () => {
            sharpResized.png(sharpPngConfig);
        },
        jpg: () => {
            sharpResized.jpeg(sharpJpgConfig);
        },
        gif: () => {
            // sharpResized.gif();
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

interface Config {
    imagePath: string;
    outputFolder: string;
    imageSize: { width: number, height: number };
    sizes: number[];
}

export const generateImageSizeVariants = async (config: Config) => {
    const sizes = config.sizes
        .filter(size => {
            if (!config.imageSize.height) throw new Error(`height not defined for file: ${config.imagePath}`);

            return size < config.imageSize.height;
        });

    const imageSizesPromises = sizes.map(size => {
        const sizeVariantOutputPath = outputPath.replace(/(\..+)$/, (_, ext) => `_${size}${ext}`);

        return generateImage({
            fileSharp,
            fileExt,
            height: size,
            outputPath: sizeVariantOutputPath,
            outputFolder: config.outputFolder,
        });
    });

    await Promise.all(imageSizesPromises);
};