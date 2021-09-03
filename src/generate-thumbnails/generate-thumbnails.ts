import * as path from 'path';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as fastGlob from 'fast-glob';
import * as yaml from 'yaml';

import { processImageFiles } from './process-image-files';
import { ConfigProject, validateConfig } from '../config-validation';

const configStr = fs.readFileSync('./config.yaml', 'utf8')
const configVal = yaml.parse(configStr);

const THUMBNAIL_SIZES = [720, 360, 180, 90];

const config = validateConfig(configVal);

export type FileProcessOpts = { path: string; thumbnailsOutput: string; sizes: number[] };
export type FileProcessCb = (path: string, relPath: string) => void;
export type FileProcessFn = (opts: FileProcessOpts, entries: string[], onFileProcessed: FileProcessCb) => Promise<void>

async function processProjectFiles(opts: { projectConfig: ConfigProject; extensions: string[]; onProcess: FileProcessFn }) {
    const extStrings = opts.extensions.map(e => [e, e.toUpperCase()]).flat();
    const extStr = extStrings.join(',');
    const globPath = path.join(opts.projectConfig.path, `/**/*.{${extStr}}`).replace(/\\/g, '/');
    // console.log('globPath', globPath)
    const entries = await fastGlob(globPath);
    const timeA = performance.now();

    console.log(`--- processing files (${opts.extensions.join(', ')}) ---`);

    let processedFiles = 0;

    await opts.onProcess({path: opts.projectConfig.path, thumbnailsOutput: opts.projectConfig.thumbnailsOutput, sizes: THUMBNAIL_SIZES}, entries, (entry, fileRelativePath) => {
        processedFiles += 1;

        const perc = Math.round(processedFiles / entries.length * 100);

        console.log('done', `${processedFiles}/${entries.length} (${perc}%)`, fileRelativePath);
    });

    console.log('--- done ---');
    console.log(`took ${Math.round((performance.now() - timeA) / 1000)}s`);
}

async function processProject(project: ConfigProject) {
    console.log(`=== ${project.path} images processing started`);

    await processProjectFiles({
        projectConfig: project,
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        onProcess: processImageFiles,
    });

        // console.log(`=== ${p.path} videos processing started`);

        // await processFiles({
        //     projectConfig: p,
        //     extensions: ['mp4', 'webm'],
        //     onProcess: processVideoFiles,
        // });
}

(async () => {

    await processProject((config.projects as any)['inspiration']);

    // for (const p of config.projects) {
    //     await processProject(p);
    // }

})();