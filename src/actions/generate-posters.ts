import { Config } from '../config-validation';
import { systemPath } from '../lib/system-path';
import { JsonDbInstance } from '../types';
import { updateFiles } from './update-files';
import * as FileMetadata from '../lib/file-metadata/file-metadata';
import { PosterJob, PosterJobsStore } from '../lib/poster-jobs-store/poster-jobs-store';

export type FilesPostersGenerateReqBody = {
    filePaths: string[];
};

type Opts = {
    db: JsonDbInstance;
    config: Config;
    projectName: string;
    posterJobsStore: PosterJobsStore;
    body: FilesPostersGenerateReqBody;
};

export const generatePosters = async (opts: Opts): Promise<PosterJob> => {
    const posterJob = opts.posterJobsStore.createJob({
        filePaths: opts.body.filePaths,
    });

    const filePathsMap = new Map<string, string>();
    const files = opts.body.filePaths.map(fp => {
        const src = systemPath(opts.config.getMediaAbsPath(opts.projectName, fp));
        const destDir = systemPath(opts.config.getPosterAbsPath(opts.projectName, systemPath(fp).folder));

        filePathsMap.set(src.raw, fp);

        return {
            src,
            destDir,
        };
    });

    FileMetadata.generatePosters({
        files,
        onFileProcessed: async (err, file, progress) => {
            posterJob.progress = progress;

            if (err) {
                posterJob.failed.push(err);
            }
            else if (file) {
                posterJob.succeeded.push(file);

                await updateFiles({
                    db: opts.db,
                    body: {
                        files: [
                            {
                                path: filePathsMap.get(file.src),
                                meta: {
                                    poster: opts.config.getPosterRelPath(opts.projectName, file.dest)
                                }
                            }
                        ]
                    }
                })
            }
        }
    });

    return posterJob;
};