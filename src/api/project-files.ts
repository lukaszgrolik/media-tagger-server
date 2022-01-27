
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';

import { Config } from '../config-validation';
import * as utils from '../lib/utils';
import { JsonDbInstance, UniversalResBody } from '../types';
import { DiskFileData, listDiskFiles } from '../actions/list-disk-files';
import { UpdateFilesReqBody, updateFiles } from '../actions/update-files';
import { UpdateFilesTagsReqBody, updateFilesTags } from '../actions/update-files-tags';
import { generatePosters } from '../lib/file-metadata/generate-posters';
import { systemPath } from '../lib/system-path';


export const projectFiles = (app: express.Router, config: Config) => {
    const diskFilesPerProject = new Map<string, DiskFileData[]>();

    app.get<{}, DiskFileData[]>('/files', async (req, res, next) => {
        const projectName = res.locals.projectName as string;

        try {
            const diskFiles = diskFilesPerProject.get(projectName)
            if (diskFiles) {
                res.json(diskFiles);
            }
            else {
                const diskFiles = await listDiskFiles({projectName, config});
                diskFilesPerProject.set(projectName, diskFiles);

                res.json(diskFiles);
            }
        }
        catch (err: unknown) {
            next(err);
        }
    });

    app.put<{}, UniversalResBody, UpdateFilesReqBody>('/files', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;

        try {
            const dbRes = await updateFiles({db, body: req.body});

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

    app.put<{}, UniversalResBody, UpdateFilesTagsReqBody>('/files/tags', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;

        try {
            const dbRes = await updateFilesTags({db, body: req.body});

            res.json({
                files: dbRes.files,
                tags: dbRes.tags,
            });
        }
        catch (err: unknown) {
            next(err);
        }
    });

    class PosterJob {
        readonly createdAt: string;
        readonly filePaths: string[];

        progress: {count: number; progress: number; date: string} = {count: 0, progress: 0, date: ''};

        readonly failed: {
            path: string;
            error: Error;
        }[] = [];

        readonly succeeded: {
            src: string;
            dest: string;
        }[] = [];

        constructor(readonly id: number, body: {createdAt: string; filePaths: string[]}) {
            this.createdAt = body.createdAt;
            this.filePaths = body.filePaths;
        }
    }

    class PosterJobsStore {
        private jobsIdCounter = 0;
        readonly jobs: PosterJob[] = [];

        createJob(body: {filePaths: string[]}) {
            const job = new PosterJob(++this.jobsIdCounter, {
                createdAt: new Date().toISOString(),
                filePaths: body.filePaths,
            });

            this.jobs.push(job);

            return job;
        }

        removeFinishedJobs() {
            const finishedJobs = posterJobsStore.jobs.filter(j => j.progress.progress === 1);

            finishedJobs.forEach(job => {
                const index = this.jobs.indexOf(job);
                if (index !== -1) {
                    this.jobs.splice(index, 1);
                }
            });
        }
    }

    const posterJobsStore = new PosterJobsStore();

    type FilesPostersGenerateResBody = {
        posterJobId: number;
    };
    type FilesPostersGenerateReqBody = {
        filePaths: string[];
    };

    app.post<{}, FilesPostersGenerateResBody, FilesPostersGenerateReqBody>('/files/posters/generate', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;
        const projectName = res.locals.projectName as string;

        try {
            const posterJob = posterJobsStore.createJob({
                filePaths: req.body.filePaths,
            });

            const filePathsMap = new Map<string, string>();
            const files = req.body.filePaths.map(fp => {
                const src = systemPath(config.getMediaAbsPath(projectName, fp));
                const destDir = systemPath(config.getPosterAbsPath(projectName, systemPath(fp).folder));

                filePathsMap.set(src.raw, fp);

                return {
                    src,
                    destDir,
                };
            });

            generatePosters({
                files,
                onFileProcessed: (err, file, progress) => {
                    posterJob.progress = progress;

                    if (err) {
                        posterJob.failed.push(err);
                    }
                    else if (file) {
                        posterJob.succeeded.push(file);

                        updateFiles({
                            db,
                            body: {
                                files: [
                                    {
                                        path: filePathsMap.get(file.src),
                                        meta: {
                                            poster: config.getPosterRelPath(projectName, file.dest)
                                        }
                                    }
                                ]
                            }
                        })
                    }
                }
            });

            res.json({
                posterJobId: posterJob.id,
            });
        }
        catch (err: unknown) {
            next(err);
        }
    });

    type FilesPostersStatusResBody = {
        jobs: {
            id: number;
            progress: {count: number; progress: number};
            failed: {
                path: string;
                error: Error;
            }[];
            succeeded: {
                src: string;
                dest: string;
            }[];
        }[];
    };

    app.get<{}, FilesPostersStatusResBody>('/files/posters/status', (req, res) => {
        res.json({
            jobs: posterJobsStore.jobs
        });

        posterJobsStore.removeFinishedJobs();
    });

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