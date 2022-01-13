import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';

import { generatePosters } from '../generate-posters';
import { systemPath } from '../../system-path';
import { convertPath, removeDirContents, searchGlob } from '../../utils';
import { promiseShouldThrow } from '../../../../test/test-utils';

describe('actions/generatePosters', () => {
    afterEach(async () => {
        await removeDirContents(path.resolve(__dirname, 'output-files'));
    });

    it('throws if files array contains file with empty src');
    it('throws if files array contains file with empty dest');
    // it('throws if files array contains file with empty sizes array');

    it('throws if file not found', async () => {
        const srcFilePath = path.resolve(__dirname, 'source-files/doesnt exist.mp4');
        const opts = {
            files: [
                {
                    src: systemPath(srcFilePath),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                }
            ],
        };

        const res = await generatePosters(opts);

        should(res.failed.length).equal(1);
        should(res.failed[0].path).equal(srcFilePath);
        should(res.failed[0].error.message).equal(`file not found: "${srcFilePath}"`);
        should(res.succeeded.length).equal(0);
    });

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

        should(res.failed.length).equal(0);
        should(res.succeeded.length).equal(1);
        should(res.succeeded[0]).deepEqual({
            src: path.resolve(__dirname, 'source-files/starfish.mp4'),
            dest: path.resolve(__dirname, 'output-files/starfish_poster.jpg')
        });

        // ensure it doesn't output other files
        const files = await fs.promises.readdir(path.resolve(__dirname, 'output-files/'));

        should(files).deepEqual([
            'starfish_poster.jpg'
        ]);
    });

    it('generates poster image for a webm file');

    it('generates multiple poster images for multiple mp4 files', async () => {
        const opts = {
            files: [
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/starfish.mp4')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                    // sizes: [],
                },
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/hippo.mp4')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/')),
                    // sizes: [],
                }
            ],
        };

        const res = await generatePosters(opts);

        if (res.failed.length) {
            throw res.failed[0].error;
        }

        should(res.failed.length).equal(0);
        should(res.succeeded.length).equal(2);
        should(res.succeeded[0]).deepEqual({
            src: path.resolve(__dirname, 'source-files/starfish.mp4'),
            dest: path.resolve(__dirname, 'output-files/starfish_poster.jpg')
        });
        should(res.succeeded[1]).deepEqual({
            src: path.resolve(__dirname, 'source-files/hippo.mp4'),
            dest: path.resolve(__dirname, 'output-files/hippo_poster.jpg')
        });

        // ensure it doesn't output or leave other files
        const files = await fs.promises.readdir(path.resolve(__dirname, 'output-files/'));

        should(files.sort()).deepEqual([
            'hippo_poster.jpg',
            'starfish_poster.jpg',
        ]);
    });

    it('creates destination folders if non-existent', async () => {
        const opts = {
            files: [
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/starfish.mp4')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/foo/bar/')),
                    // sizes: [],
                }
            ],
        };

        const res = await generatePosters(opts);

        if (res.failed.length) {
            throw res.failed[0].error;
        }

        should(res.failed.length).equal(0);
        should(res.succeeded.length).equal(1);
        should(res.succeeded[0]).deepEqual({
            src: path.resolve(__dirname, 'source-files/starfish.mp4'),
            dest: path.resolve(__dirname, 'output-files/foo/bar/starfish_poster.jpg')
        });

        // ensure it doesn't output other files
        const files = await searchGlob(path.resolve(__dirname, `output-files/**/*.*`));
        should(files).deepEqual([
            convertPath(path.resolve(__dirname, 'output-files/', 'foo/bar/starfish_poster.jpg'))
        ]);
    });

    it('creates destination folders if non-existent for multiple mp4 files', async () => {
        const opts = {
            files: [
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/starfish.mp4')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/qwe/')),
                    // sizes: [],
                },
                {
                    src: systemPath(path.resolve(__dirname, 'source-files/hippo.mp4')),
                    destDir: systemPath(path.resolve(__dirname, 'output-files/qwe/')),
                    // sizes: [],
                }
            ],
        };

        const res = await generatePosters(opts);

        if (res.failed.length) {
            throw res.failed[0].error;
        }

        should(res.failed.length).equal(0);
        should(res.succeeded.length).equal(2);
        should(res.succeeded[0]).deepEqual({
            src: path.resolve(__dirname, 'source-files/starfish.mp4'),
            dest: path.resolve(__dirname, 'output-files/qwe/starfish_poster.jpg')
        });
        should(res.succeeded[1]).deepEqual({
            src: path.resolve(__dirname, 'source-files/hippo.mp4'),
            dest: path.resolve(__dirname, 'output-files/qwe/hippo_poster.jpg')
        });

        // ensure it doesn't output or leave other files
        const files = await searchGlob(path.resolve(__dirname, `output-files/**/*.*`));

        should(files.sort()).deepEqual([
            convertPath(path.resolve(__dirname, 'output-files/qwe/hippo_poster.jpg')),
            convertPath(path.resolve(__dirname, 'output-files/qwe/starfish_poster.jpg')),
        ]);
    });

    it('generates multiple poster images for multiple file types');
});