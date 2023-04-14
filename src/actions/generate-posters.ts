import { Config } from '../config-validation';
import { systemPath } from '../lib/system-path';
import { JsonDbInstance } from '../types';
import { updateFiles } from './update-files';
import * as FileMetadata from '../lib/file-metadata/file-metadata';
import { GenerateVideoPostersJob, JobService } from '../lib/job-service';

export type FilesPostersGenerateReqBody = {
    filePaths: string[];
};

type Opts = {
    db: JsonDbInstance;
    config: Config;
    projectName: string;
    jobService: JobService;
    body: FilesPostersGenerateReqBody;
};

export const generatePosters = async (opts: Opts): Promise<GenerateVideoPostersJob> => {
    const posterJob = new GenerateVideoPostersJob({
        action: jobAction,
        filePaths: opts.body.filePaths,
    });
    opts.jobService.enqueueJob(posterJob);

    async function jobAction() {
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

        await FileMetadata.generatePosters({
            files,
            onFileProcessed: async (err, file, progress) => {
                if (err) {
                    posterJob.markFileFailed(err);
                }
                else if (file) {
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
                    });

                    posterJob.markFileSucceeded(file);
                }
            }
        });
    }

    return posterJob;
};