
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';

import { Config } from '../config-validation';
import * as utils from '../lib/utils';
import { JsonDbInstance, UniversalResBody } from '../types';
import * as Actions from '../actions/actions';
import { systemPath } from '../lib/system-path';

export const projectFiles = (app: express.Router, config: Config) => {
    const diskFilesPerProject = new Map<string, Actions.DiskFileData[]>();

    app.get<{}, Actions.DiskFileData[]>('/files', async (req, res, next) => {
        const projectName = res.locals.projectName as string;

        try {
            const diskFiles = diskFilesPerProject.get(projectName)
            if (diskFiles) {
                res.json(diskFiles);
            }
            else {
                const diskFiles = await Actions.listDiskFiles({projectName, config});
                diskFilesPerProject.set(projectName, diskFiles);

                res.json(diskFiles);
            }
        }
        catch (err: unknown) {
            next(err);
        }
    });

    app.put<{}, UniversalResBody, Actions.UpdateFilesReqBody>('/files', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;

        try {
            const dbRes = await Actions.updateFiles({db, body: req.body});

            res.json({
                files: dbRes,
                // @todo handle new tags
                // tags: ...
            });
        }
        catch (err: unknown) {
            next(err);
        }
    });

    app.put<{}, UniversalResBody, Actions.UpdateFilesTagsReqBody>('/files/tags', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;

        try {
            const dbRes = await Actions.updateFilesTags({db, body: req.body});

            res.json({
                files: dbRes.files,
                tags: dbRes.tags,
            });
        }
        catch (err: unknown) {
            next(err);
        }
    });

    //
    //
    //
    //
    //

    type FilesPostersGenerateResBody = {
        jobId: number;
    };

    app.post<{}, FilesPostersGenerateResBody, Actions.FilesPostersGenerateReqBody>('/files/posters/generate', async (req, res, next) => {
        const jobService = res.locals.jobService;
        const db = res.locals.db as JsonDbInstance;
        const projectName = res.locals.projectName as string;

        // @todo validate req.body - filePaths

        try {
            const job = await Actions.generatePosters({
                db,
                config,
                projectName,
                jobService,
                body: req.body,
            });

            res.json({
                jobId: job.id,
            });
        }
        catch (err: unknown) {
            next(err);
        }
    });

    //
    //
    //
    //
    //

    type FilesThumbnailsGenerateResBody = {
        jobId: number;
    };

    app.post<{}, FilesThumbnailsGenerateResBody, Actions.FilesThumbnailsGenerateReqBody>('/files/thumbnails/generate', async (req, res, next) => {
        const jobService = res.locals.jobService;
        const db = res.locals.db as JsonDbInstance;
        const projectName = res.locals.projectName as string;

        // @todo validate req.body - filePaths, sizes

        try {
            const job = await Actions.generateThumbnails({
                db,
                config,
                projectName,
                jobService,
                body: req.body,
            });

            res.json({
                jobId: job.id,
            });
        }
        catch (err: unknown) {
            next(err);
        }
    });

    //
    //
    //
    //
    //

    app.post<{}, Actions.FilesMetaStatResBody, Actions.FilesMetaStatReqBody>('/files/meta/stat', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;
        const projectName = res.locals.projectName as string;

        try {
            const data = await Actions.fetchMetaStat({
                db,
                config,
                projectName,
                body: req.body,
            });

            res.json(data);
        }
        catch (err: unknown) {
            next(err);
        }
    });

    // '/files/meta/sharp'

    // type PutFilesTagsAddReqBody = {
    //     filesIds: number[];
    //     tagsIds?: number[];
    //     // @todo
    //     // newTags?: { name: string; parentId?: number | null }[];
    // };

    // app.put<{}, UniversalResBody, PutFilesTagsAddReqBody>('/files/tags/add', async (req, res) => {
    //     const db = res.locals.db as JsonDbInstance;

    //     // @todo validate files exist
    //     // @todo validate all tags from req.body exist

    //     const {tagsIds} = req.body;

    //     if (tagsIds && tagsIds.length > 0) {

    //         const dataBefore = await db.read();
    //         const dbRes = await db.transaction(async tx => {
    //             const reqs = req.body.filesIds.map(fileId => {
    //                 const file = dataBefore.files.find(f => f.id === fileId);
    //                 if (!file) throw new Error(`unexpected error: file not found (id=${fileId})`);

    //                 const updatedTagsIds = file.tagsIds.slice().concat(tagsIds);

    //                 return tx.update('files', fileId, {
    //                     tagsIds: updatedTagsIds,
    //                 });
    //             });

    //             return Promise.all(reqs);
    //         });


    //         res.json({
    //             files: dbRes,
    //             // tags: ...
    //         });
    //     }
    //     else {
    //         res.json({
    //             files: []
    //         });
    //     }
    // });

    // type PutFilesTagsRemoveReqBody = {
    //     filesIds: number[];
    //     tagsIds?: number[];
    //     // @todo
    //     // newTags?: { name: string; parentId?: number | null }[];
    // };

    // app.put<{}, UniversalResBody, PutFilesTagsRemoveReqBody>('/files/tags/remove', async (req, res) => {
    //     const db = res.locals.db as JsonDbInstance;

    //     // @todo validate files exist
    //     // @todo validate all tags from req.body exist

    //     const { tagsIds } = req.body;

    //     if (tagsIds && tagsIds.length > 0) {

    //         const dataBefore = await db.read();
    //         const dbRes = await db.transaction(async tx => {
    //             const reqs = req.body.filesIds.map(fileId => {
    //                 const file = dataBefore.files.find(f => f.id === fileId);
    //                 if (!file) throw new Error(`unexpected error: file not found (id=${fileId})`);

    //                 const updatedTagsIds = tagsIds.filter(tagId => {
    //                     return tagsIds.includes(tagId) === false;
    //                 });

    //                 return tx.update('files', fileId, {
    //                     tagsIds: updatedTagsIds,
    //                 });
    //             });

    //             return Promise.all(reqs);
    //         });


    //         res.json({
    //             files: dbRes,
    //             // tags: ...
    //         });
    //     }
    //     else {
    //         res.json({
    //             files: []
    //         });
    //     }
    // });
}