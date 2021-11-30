import * as path from 'path';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as fastGlob from 'fast-glob';
import * as yaml from 'yaml';

import { processImageFile } from './process-image-files';
import { ConfigProject, validateConfig } from '../config-validation';
import { processVideoFile } from './process-video-files';

const configStr = fs.readFileSync('./config.yaml', 'utf8')
const configVal = yaml.parse(configStr);

const config = validateConfig(configVal);

export type ProcessFileFnOptions = { path: string; thumbnailsOutput: string; sizes: number[] };
export type ProcessFileFn = (config: {options: ProcessFileFnOptions, entry: string}) => Promise<void>

async function processProjectFile(entry: string) {
    const fileExtMatch = entry.match(/[^\.]+$/)
    if (!fileExtMatch) throw new Error(`file extension not detected: ${entry}`);

    const fileExt = fileExtMatch[0].toLowerCase();

    const fileRelativePath = path.resolve(entry).replace(path.resolve(opts.path), '');
    const outputPath = path.join(opts.thumbnailsOutput, fileRelativePath);
    const outputFolderPath = path.dirname(outputPath);

    if (createdFileFolders.includes(outputFolderPath) === false) {
        await fs.promises.mkdir(outputFolderPath, { recursive: true });
        createdFileFolders.push(outputFolderPath);
    }

    await opts.onProcessFile({
        entry,
        options: {
            path: opts.projectConfig.path,
            thumbnailsOutput: opts.projectConfig.thumbnailsOutput,
            sizes: THUMBNAIL_SIZES,
        },
    });

    processedFiles += 1;

    const perc = Math.round(processedFiles / entries.length * 100);
    const sizesText = `(${sizes.length ? sizes.join(', ') : 'height too small'})`;

    console.log('done', `${processedFiles}/${entries.length} (${perc}%)`, fileRelativePath, sizesText);
}

async function processProjectFiles(opts: { projectConfig: ConfigProject; extensions: string[]; onProcessFile: ProcessFileFn }) {
    const extStrings = opts.extensions.map(e => [e, e.toUpperCase()]).flat();
    const extStr = extStrings.join(',');
    const globPath = path.join(opts.projectConfig.path, `/**/*.{${extStr}}`).replace(/\\/g, '/');
    // console.log('globPath', globPath)
    const entries = await fastGlob(globPath);
    const timeA = performance.now();

    console.log(`--- processing files (${opts.extensions.join(', ')}) ---`);

    let processedFiles = 0;
    const createdFileFolders: string[] = [];

    const promises = entries.map(processProjectFile);

    await Promise.all(promises);

    console.log('--- done ---');
    console.log(`took ${Math.round((performance.now() - timeA) / 1000)}s`);
}

async function processProject(project: ConfigProject) {
    console.log(`=== ${project.path} images processing started`);

    await processProjectFiles({
        projectConfig: project,
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        onProcessFile: processImageFile,
    });

    console.log(`=== ${project.path} videos processing started`);

    await processProjectFiles({
        projectConfig: project,
        extensions: ['mp4', 'webm'],
        onProcessFile: processVideoFile,
    });
}

(async () => {

    await processProject((config.projects as any)['xps']);

    // for (const p of config.projects) {
    //     await processProject(p);
    // }

})();