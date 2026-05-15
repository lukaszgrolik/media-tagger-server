import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import should = require('should');
import * as sharp from 'sharp';

import { removeDirContents } from '../../utils';
import { generateImagesSizeVariants, GenerateSizeVariantsOpts } from '../generate-images-size-variants';
import { systemPath } from '../../system-path';
import { generateImageSizeVariants } from '../../../generate-thumbnails/generate-image-size-variants';

async function generateThumbnails(body: {paths: string[]; sizes: number[]}) {
    const opts: GenerateSizeVariantsOpts = {
        files: body.paths.map(file => {
            return {
                src: systemPath(path.resolve(__dirname, 'source-files', file)),
                destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                // destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
                sizes: body.sizes.map(size => {
                    return { maxHeight: size };
                }),
            }
        })
    };

    const res = await generateImagesSizeVariants(opts);

    should(res.failed.length).equal(0);
    should(res.succeeded.length).equal(body.paths.length);

    for (const path of body.paths) {
        const i = body.paths.indexOf(path);
        const processedSizes = res.succeeded[i].sizes;

        const metadataOrigin = await sharp(opts.files[i].src.path).metadata();
        const metadataOriginHeight = metadataOrigin.height || 0;
        const sizeRatio = (metadataOrigin.width || 0) / metadataOriginHeight;

        let expectedProcessedSizesCount = 0;
        for (const size of body.sizes) {
            if (metadataOriginHeight > size) expectedProcessedSizesCount += 1;
        }

        // console.log(processedSizes.map(s => s.size));

        // should(processedSizes.length).equal(body.sizes.length);
        should(processedSizes.length).equal(expectedProcessedSizesCount);

        for (const procSize of processedSizes) {
            const size = procSize.size;

            // console.log('size', size)

            const metadataResized = await sharp(procSize.path.path).metadata();

            should(metadataResized.height).equal(size);
            should(metadataResized.width).equal(Math.round(size * sizeRatio));
        }
    }
}

describe('generateSizeVariants', () => {
    afterEach(async () => {
        await removeDirContents(path.resolve(__dirname, 'output-files'));
    });

    it('throws if files array contains file with empty src');
    it('throws if files array contains file with empty dest');
    it('throws if files array contains file with empty sizes array');

    it('throws if file not found');

    it('generates thumbnail size variant for a jpg image', async () => {
        await generateThumbnails({
            paths: [
                'sunset.jpg'
            ],
            sizes: [360],
        });
    });

    it('generates thumbnail size variant for a png image', async () => {
        await generateThumbnails({
            paths: [
                'europe.png'
            ],
            sizes: [360],
        });
    });

    it('generates thumbnail size variant for a gif image');
    it('generates thumbnail size variant for a webp image');

    it('generates multiple thumbnail size variants', async () => {
        await generateThumbnails({
            paths: [
                'sunset.jpg',
            ],
            sizes: [180, 360, 720],
        });
    });

    it('generates multiple thumbnail size variants for multiple images of the same type', async () => {
        await generateThumbnails({
            paths: [
                'sunset.jpg',
                'meadow.jpg',
            ],
            sizes: [180, 360, 720],
        });
    });

    it('generates multiple thumbnail size variants for multiple image types', async () => {
        await generateThumbnails({
            paths: [
                'sunset.jpg',
                'europe.png',
            ],
            sizes: [180, 360, 720],
        });
    });

    // it('does not generate thumbnails larger than source image', async () => {
    //     const opts: GenerateSizeVariantsOpts = {
    //         files: [
    //             {
    //                 src: systemPath(path.resolve(__dirname, 'source-files/test_2.jpg')),
    //                 destDir: systemPath(path.resolve(__dirname, 'output-files/')),
    //                 // destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
    //                 sizes: [{ maxHeight: 100 }],
    //             }
    //         ],
    //     };

    //     const metadataOrigin = await sharp(opts.files[0].src.path).metadata();

    //     const res = await generateImageSizeVariants(opts);

    //     // const metadataCopy = await sharp(opts.files[0].dest).metadata();

    //     // @todo should not exist
    //     await fs.promises.stat(res.processed[0].sizes[0].dest.path);

    //     // should(metadataCopy.height).equal(metadataOrigin.height);
    //     // should(metadataCopy.width).equal(metadataOrigin.width);
    // });
});

