
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
import { UpdateFilesReqBody, updateFiles } from '../actions/update-files';
import { PutFilesTagsReqBody as UpdateFilesTagsReqBody, updateFilesTags } from '../actions/update-files-tags';
import { generatePosters } from '../lib/file-metadata/generate-posters';
import { systemPath } from '../lib/system-path';

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