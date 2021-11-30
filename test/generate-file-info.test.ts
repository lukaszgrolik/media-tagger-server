import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';

interface Db {
    files: {
        src: string;
        size: [number, number];
    }[];
}

describe('generate-file-info', () => {
    it('throws if invalid input path given');
    it('throws if invalid output path given');
    it('detects source files');
    it('saves generated info to file');
    it('loads generated info from file and processes only new files');
});