import * as path from 'path';
import * as fs from 'fs';

import { Config } from '../config-validation';
import { systemPath } from '../lib/system-path';
import { JsonDbInstance } from '../types';
import { updateFiles } from './update-files';
import * as FileMetadata from '../lib/file-metadata/file-metadata';
import { PosterJob, PosterJobsStore } from '../lib/poster-jobs-store/poster-jobs-store';

export type FilesMetaStatReqBody = {
    filePaths: string[];
};

export type FilesMetaStatResBody = {
    success: boolean;
};

type Opts = {
    db: JsonDbInstance;
    config: Config;
    projectName: string;
    body: FilesMetaStatReqBody;
};

export const fetchMetaStat = async (opts: Opts): Promise<FilesMetaStatResBody> => {
    const { projectName, config } = opts;

    const updateMetaStat = async (relPath: string) => {
        const fullPath = opts.config.getMediaAbsPath(opts.projectName, relPath)
        const stat = await fs.promises.stat(fullPath);

        await updateFiles({
            db: opts.db,
            body: {
                files: [
                    {
                        path: relPath,
                        meta: {
                            mtime: stat.mtime.toISOString(),
                            fileSize: stat.size,
                        }
                    }
                ]
            }
        })
    }

    for (const filePath of opts.body.filePaths) {
        await updateMetaStat(filePath);
    }

    return {success: true};
};