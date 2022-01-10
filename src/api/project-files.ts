
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';
import * as glob from 'glob';
import * as cors from 'cors';
import * as yaml from 'yaml';

import { Config } from '../config-validation';
import * as utils from '../lib/utils';
import { JsonDbInstance, UniversalResBody } from '../types';

export const projectFiles = (app: express.Router, config: Config) => {
    app.get('/files', async (req, res) => {
        const projectName = res.locals.projectName as string;

        const mediaFolderPath = config.getMediaFolderPath(projectName);

        // console.log('mediaFolderPath', convertPath(mediaFolderPath))

        // res.send('Hello World!');
        const ext = ['mp4', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
        const extStr = ext.map(e => [e, e.toUpperCase()]).flat().join(',');
        const fileGlob = `**/*.{${extStr}}`;

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

        const paths = files.map(f => {
            let root = utils.convertPath(mediaFolderPath);
            if (root[root.length - 1] === '/') root = root.slice(0, -1);

            return f.replace(root, '');
        });

        const promises = paths.map(async relPath => {
            const fullPath = path.join(mediaFolderPath, relPath);
            const stat = await fs.promises.stat(fullPath);

            const res: {
                path: string;
                ctime: Date;
                mtime: Date;
                size: number;
                width: number | undefined;
                height: number | undefined;
            } = {
                path: relPath,
                ctime: stat.ctime,
                mtime: stat.mtime,
                size: stat.size,
                width: -1,
                height: -1,
            };

            const fileExtMatch = relPath.match(/[^\.]+$/)
            if (!fileExtMatch) throw new Error(`file extension not detected: ${relPath}`);

            const ext = fileExtMatch[0];
            const metadataImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            const metadataImageExtsStrings = metadataImageExts.map(e => [e, e.toUpperCase()]).flat();

            // if (metadataImageExtsStrings.includes(ext)) {
            //     try {

            //         const metadata = await sharp(fullPath).metadata();
            //         res.width = metadata.width;
            //         res.height = metadata.height;
            //     }
            //     catch (err) {
            //         console.warn('err', ext, relPath);

            //         // throw err;
            //     }
            // }
            // else {
            //     // console.log('aaa', ext);
            // }

            return res;
        });
        const resData = await Promise.all(promises);

        res.json(resData);
    });

    type PutFilesReqBody = {
        files: {
            id: number;
            description?: string;
            tagsIds?: number[];
            // @todo
            // newTags?: {name: string; parentId?: number | null}[];
        }[];
    };

    app.put<{}, UniversalResBody, PutFilesReqBody>('/files', async (req, res) => {
        const db = res.locals.db as JsonDbInstance;

        // @todo validate files exist
        // @todo validate all tags from req.body exist

        const dbRes = await db.transaction(async tx => {
            const reqs = req.body.files.map(f => {
                return tx.update('files', f.id, f);
            });

            return Promise.all(reqs);
        });


        res.json({
            files: dbRes,
            // tags: ...
        });
    });

    type PutFilesTagsAddReqBody = {
        filesIds: number[];
        tagsIds?: number[];
        // @todo
        // newTags?: { name: string; parentId?: number | null }[];
    };

    app.put<{}, UniversalResBody, PutFilesTagsAddReqBody>('/files/tags/add', async (req, res) => {
        const db = res.locals.db as JsonDbInstance;

        // @todo validate files exist
        // @todo validate all tags from req.body exist

        const {tagsIds} = req.body;

        if (tagsIds && tagsIds.length > 0) {

            const dataBefore = await db.read();
            const dbRes = await db.transaction(async tx => {
                const reqs = req.body.filesIds.map(fileId => {
                    const file = dataBefore.files.find(f => f.id === fileId);
                    if (!file) throw new Error(`unexpected error: file not found (id=${fileId})`);

                    const updatedTagsIds = file.tagsIds.slice().concat(tagsIds);

                    return tx.update('files', fileId, {
                        tagsIds: updatedTagsIds,
                    });
                });

                return Promise.all(reqs);
            });


            res.json({
                files: dbRes,
                // tags: ...
            });
        }
        else {
            res.json({
                files: []
            });
        }
    });

    type PutFilesTagsRemoveReqBody = {
        filesIds: number[];
        tagsIds?: number[];
        // @todo
        // newTags?: { name: string; parentId?: number | null }[];
    };

    app.put<{}, UniversalResBody, PutFilesTagsRemoveReqBody>('/files/tags/remove', async (req, res) => {
        const db = res.locals.db as JsonDbInstance;

        // @todo validate files exist
        // @todo validate all tags from req.body exist

        const { tagsIds } = req.body;

        if (tagsIds && tagsIds.length > 0) {

            const dataBefore = await db.read();
            const dbRes = await db.transaction(async tx => {
                const reqs = req.body.filesIds.map(fileId => {
                    const file = dataBefore.files.find(f => f.id === fileId);
                    if (!file) throw new Error(`unexpected error: file not found (id=${fileId})`);

                    const updatedTagsIds = tagsIds.filter(tagId => {
                        return tagsIds.includes(tagId) === false;
                    });

                    return tx.update('files', fileId, {
                        tagsIds: updatedTagsIds,
                    });
                });

                return Promise.all(reqs);
            });


            res.json({
                files: dbRes,
                // tags: ...
            });
        }
        else {
            res.json({
                files: []
            });
        }
    });
}