import * as path from 'path';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import {glob} from 'glob';

export const getDirectories = async (source: string) => {
    const results = await fs.promises.readdir(source, { withFileTypes: true });

    return results.filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort((a, b) => a.localeCompare(b))
};

export const convertPath = (str: string) => str.replace(/\\/g, '/');

export const searchGlob = (globPath: string): Promise<string[]> => {
    globPath = convertPath(globPath);

    return glob(globPath);
};

// fixes issue when no files found on "Z:/"
export const searchGlobDisk = async (rootPath: string, fileGlob: string) => {
    const dirs = await getDirectories(rootPath);

    const promises = dirs.map(dir => {
        const subDirPath = convertPath(path.resolve(rootPath, dir, fileGlob));
        // console.log('subDirPath', subDirPath)
        return searchGlob(subDirPath);
    });
    const filesResults = await Promise.all(promises);
    return filesResults.flat();
};

export async function removeDirContents(dirPath: string) {
    // const files = await fs.promises.readdir(dirPath)
    // const promises = files.map(file => {
    //     return fs.promises.unlink(path.join(dirPath, file));
    // });

    // return Promise.all(promises);
    await fsExtra.emptyDir(dirPath);
}

export async function createMissingSubDirectories(paths: string[]) {
    const dirs = [...new Set(paths)];

    await Promise.all(
        dirs.map(dir => fsExtra.mkdirp(dir))
    );
}