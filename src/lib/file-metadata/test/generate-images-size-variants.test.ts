import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';
import * as sharp from 'sharp';
import { generateImagesSizeVariants, GenerateSizeVariantsOpts } from '../generate-images-size-variants';
import { systemPath } from '../../system-path';
import { generateImageSizeVariants } from '../../../generate-thumbnails/generate-image-size-variants';

describe('generateSizeVariants', () => {
    it('throws if files array contains file with empty src');
    it('throws if files array contains file with empty dest');
    it('throws if files array contains file with empty sizes array');

    it('throws if file not found');

    it('generates thumbnail size variants for a jpg image', async () => {
        const opts: GenerateSizeVariantsOpts = {
            files: [
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/test_1.jpg')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                    destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
                    sizes: [{ maxHeight: 100 }],
                }
            ],
        };

        const metadataOrigin = await sharp(opts.files[0].src.path).metadata();
        const sizeRatio = (metadataOrigin.width || 0) / (metadataOrigin.height || 0);

        const res = await generateImagesSizeVariants(opts);

        should(res.processed.length).equal(1);
        should(res.processed[0].sizes.length).equal(1);
        should(res.processed[0].sizes[0].size[0]).equal(100 * sizeRatio);
        should(res.processed[0].sizes[0].size[1]).equal(100);

        const metadataResized = await sharp(res.processed[0].sizes[0].dest.path).metadata();

        should(metadataResized.height).equal(100);
        should(metadataResized.width).equal(100 * sizeRatio);
    });

    it('generates thumbnail size variants for a png image');
    it('generates thumbnail size variants for a gif image');
    it('generates thumbnail size variants for a webp image');

    it('generates multiple size variants for multiple image types');

    it('does not generate thumbnails larger than source image', async () => {
        const opts: GenerateSizeVariantsOpts = {
            files: [
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/test_2.jpg')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                    destFilename: (name, size, ext) => `${name}_${size[1]}${ext}`,
                    sizes: [{ maxHeight: 100 }],
                }
            ],
        };

        const metadataOrigin = await sharp(opts.files[0].src.path).metadata();

        const res = await generateImageSizeVariants(opts);

        // const metadataCopy = await sharp(opts.files[0].dest).metadata();

        // @todo should not exist
        await fs.promises.stat(res.processed[0].sizes[0].dest.path);

        // should(metadataCopy.height).equal(metadataOrigin.height);
        // should(metadataCopy.width).equal(metadataOrigin.width);
    });
});