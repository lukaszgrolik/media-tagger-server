import 'mocha';
import * as should from 'should';

import { systemPath, SystemPath } from '../src/lib/system-path';

describe('SystemPath', () => {
    const tests: {input: string, expected: SystemPath}[] = [
        {
            input: 'foo.png',
            expected: {
                raw: 'foo.png',
                path: 'foo.png',
                folder: '',
                folders: [],
                file: 'foo.png',
                base: 'foo',
                ext: 'png',
                extensions: ['png'],
                fileExtPartial: 'foo',
                extLast: 'png',
            }
        },
        {
            input: 'a/b/c/',
            expected: {
                raw: 'a/b/c/',
                path: 'a/b/c/',
                folder: 'a/b/c',
                folders: ['a', 'b', 'c'],
                file: '',
                base: '',
                ext: '',
                extensions: [],
                fileExtPartial: '',
                extLast: '',
            }
        },
        {
            input: 'a/foo.png',
            expected: {
                raw: 'a/foo.png',
                path: 'a/foo.png',
                folder: 'a',
                folders: ['a'],
                file: 'foo.png',
                base: 'foo',
                ext: 'png',
                extensions: ['png'],
                fileExtPartial: 'foo',
                extLast: 'png',
            }
        },
        {
            input: 'C:/a/b/test file.tar.gz',
            expected: {
                raw: 'C:/a/b/test file.tar.gz',
                path: 'C:/a/b/test file.tar.gz',
                folder: 'C:/a/b',
                folders: ['C:', 'a', 'b'],
                file: 'test file.tar.gz',
                base: 'test file',
                ext: 'tar.gz',
                extensions: ['tar', 'gz'],
                fileExtPartial: 'test file.tar',
                extLast: 'gz',
            }
        },
        {
            input: 'C:/a/b/test file.foo.tar.gz',
            expected: {
                raw: 'C:/a/b/test file.foo.tar.gz',
                path: 'C:/a/b/test file.foo.tar.gz',
                folder: 'C:/a/b',
                folders: ['C:', 'a', 'b'],
                file: 'test file.foo.tar.gz',
                base: 'test file',
                ext: 'foo.tar.gz',
                extensions: ['foo', 'tar', 'gz'],
                fileExtPartial: 'test file.foo.tar',
                extLast: 'gz',
            }
        },
    ]

    for (const test of tests) {
        it(test.input, () => {
            const spath = systemPath(test.input);

            should(spath).deepEqual(test.expected);
        });
    }
});