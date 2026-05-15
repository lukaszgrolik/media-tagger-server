import { Config } from '../config-validation';
import { systemPath } from '../lib/system-path';
import { DatabaseInstance } from '../types';
import { updateFiles } from './update-files';
import * as FileMetadata from '../lib/file-metadata/file-metadata';
import { GenerateImageThumbnailsJob, JobService } from '../lib/job-service';

export type FilesThumbnailsGenerateReqBody = {
    filePaths: string[];
    sizes: number[];
};

type Opts = {
    db: DatabaseInstance;
    config: Config;
    projectName: string;
    jobService: JobService;
    body: FilesThumbnailsGenerateReqBody;
};

export const generateThumbnails = async (opts: Opts): Promise<GenerateImageThumbnailsJob> => {
    const genThumbJob = new GenerateImageThumbnailsJob({
        action: jobAction,
        filePaths: opts.body.filePaths,
    });
    opts.jobService.enqueueJob(genThumbJob);

    async function jobAction() {
        const filePathsMap = new Map<string, string>();
        const files = opts.body.filePaths.map(fp => {
            const src = systemPath(opts.config.getMediaAbsPath(opts.projectName, fp));
            const destDir = systemPath(opts.config.getThumbnailAbsPath(opts.projectName, systemPath(fp).folder));

            filePathsMap.set(src.raw, fp);

            return {
                src,
                destDir,
                sizes: opts.body.sizes.map(size => {
                    return { maxHeight: size };
                })
            };
        });

        console.log('JOB "generate-thumbnails" started');
        await FileMetadata.generateImagesSizeVariants({
            files,
            onFileSucceeded: async info => {
                await updateFiles({
                    db: opts.db,
                    body: {
                        files: [
                            {
                                path: filePathsMap.get(info.src.raw),
                                meta: {
                                    thumbnails: info.sizes.reduce((obj: { [height: string]: string }, size) => {
                                        const imgPath = opts.config.getThumbnailRelPath(opts.projectName, size.path.raw);
                                        obj[size.size] = imgPath;

                                        return obj;
                                    }, {})
                                }
                            }
                        ]
                    }
                });

                genThumbJob.markFileSucceeded(info);

                console.log(`progress: ${genThumbJob.processedCount}/${genThumbJob.filePaths.length}`)
            },
            onFileError: async info => {
                genThumbJob.markFileFailed({ path: info.src.path, error: info.error });

                console.log(`progress: ${genThumbJob.processedCount}/${genThumbJob.filePaths.length}`)
            }
        });
        console.log('JOB "generate-thumbnails" finished');
    }

    return genThumbJob;
};
