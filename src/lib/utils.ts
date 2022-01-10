import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';

export const getDirectories = async (source: string) => {
    const results = await fs.promises.readdir(source, { withFileTypes: true });

    return results.filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort((a, b) => a.localeCompare(b))
};

export const convertPath = (str: string) => str.replace(/\\/g, '/');

export const searchGlob = (globPath: string): Promise<string[]> => {
    return new Promise((res, rej) => {

        glob(globPath, { strict: true }, (err, files) => {
            // files is an array of filenames.
            // If the `nonull` option is set, and nothing
            // was found, then files is ["**/*.js"]
            // err is an error object or null.

            if (err) {
                rej(err);
            }

            res(files);
        });
    });
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