import { performance } from "perf_hooks";
import * as path from 'path';
import * as fs from 'fs';

import * as utils from '../lib/utils';
import { Config } from '../config-validation';

export type DiskFileData = {
    path: string;
    // ctime: Date;
    // mtime: Date;
    // size: number;
    // width: number | undefined;
    // height: number | undefined;
};

type Opts = {
    projectName: string;
    config: Config;
}

export const listDiskFiles = async (opts: Opts) => {
    const { projectName, config} = opts;

    const mediaFolderPath = config.getMediaFolderPath(projectName);

    // console.log('mediaFolderPath', convertPath(mediaFolderPath))

    // res.send('Hello World!');
    const ext = ['mp4', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const extStr = ext.map(e => [e, e.toUpperCase()]).flat().join(',');
    const fileGlob = `**/*.{${extStr}}`;

    const t0 = performance.now();

    const files = await (() => {
        if (config.projects[projectName].disk) {
            return utils.searchGlobDisk(mediaFolderPath, fileGlob);
        }
        else {
            const globPath = utils.convertPath(path.resolve(mediaFolderPath, fileGlob));
            // const globPath = convertPath(path.resolve(mediaFolderPath, '*'));
            // console.log('globPath', globPath)

            return utils.searchGlob(globPath);
        }
    })();
    // console.log(files.slice(0, 10))
    const t1 = performance.now();
    console.log(projectName, 'searchGlob', t1 - t0);

    const paths = files.map(f => {
        let root = utils.convertPath(mediaFolderPath);
        if (root[root.length - 1] === '/') root = root.slice(0, -1);

        return f.replace(root, '');
    });

    // const promises = paths.map(async relPath => {
    //     const fullPath = path.join(mediaFolderPath, relPath);
    //     const stat = await fs.promises.stat(fullPath);

    //     const res: DiskFileData = {
    //         path: relPath,
    //         // ctime: stat.ctime,
    //         // mtime: stat.mtime,
    //         // size: stat.size,
    //         // width: -1,
    //         // height: -1,
    //     };

    //     // const fileExtMatch = relPath.match(/[^\.]+$/)
    //     // if (!fileExtMatch) throw new Error(`file extension not detected: ${relPath}`);

    //     // const ext = fileExtMatch[0];
    //     // const metadataImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    //     // const metadataImageExtsStrings = metadataImageExts.map(e => [e, e.toUpperCase()]).flat();

    //     // if (metadataImageExtsStrings.includes(ext)) {
    //     //     try {

    //     //         const metadata = await sharp(fullPath).metadata();
    //     //         res.width = metadata.width;
    //     //         res.height = metadata.height;
    //     //     }
    //     //     catch (err) {
    //     //         console.warn('err', ext, relPath);

    //     //         // throw err;
    //     //     }
    //     // }
    //     // else {
    //     //     // console.log('aaa', ext);
    //     // }

    //     return res;
    // });
    // const t2 = performance.now();
    // const resData = await Promise.all(promises);
    // const t3 = performance.now();
    // console.log(projectName, 'stat', t3 - t2);

    const resData = paths.map(relPath => {
        return {
            path: relPath,
        };
    })

    return resData;
};