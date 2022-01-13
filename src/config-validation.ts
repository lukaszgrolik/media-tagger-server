import * as path from 'path';
import { convertPath } from './lib/utils';

export type ConfigProject = {
    path: string;
    disk?: boolean;
    db: string;
    postersOutput: string;
    thumbnailsOutput: string;
}

type ProjectsConfig = { [key: string]: ConfigProject };

export class Config {
    readonly port: number;
    readonly projects: ProjectsConfig;

    constructor(opts: {port: number; projects: ProjectsConfig}) {
        this.port = opts.port;
        this.projects = opts.projects;
    }

    getMediaFolderPath(projectName: string) {
        return path.resolve(this.projects[projectName].path);
    }

    getPostersFolderPath(projectName: string) {
        return path.resolve(this.projects[projectName].postersOutput);
    }

    getThumbnailsFolderPath(projectName: string) {
        return path.resolve(this.projects[projectName].thumbnailsOutput);
    }

    getDbPath(projectName: string) {
        return path.resolve(this.projects[projectName].db);
    }

    getMediaAbsPath(projectName: string, filePath: string) {
        return path.join(this.getMediaFolderPath(projectName), filePath)
    }

    getPosterAbsPath(projectName: string, filePath: string) {
        return path.join(this.getPostersFolderPath(projectName), filePath);
    }

    getPosterRelPath(projectName: string, filePath: string) {
        const postersFolderPath = this.getPostersFolderPath(projectName);
        const relPath = convertPath(filePath.replace(postersFolderPath, ''));

        return `${relPath[0] === '/' ? '' : '/'}${relPath}`;
    }
}

export function validateConfig(configData: any): Config {
    if (typeof configData !== 'object' || configData === null) throw new Error('config must be an object');

    if (!configData.port || typeof configData.port !== 'number') throw new Error('port must be a number');
    if (!configData.projects || typeof configData.projects !== 'object' || configData.project === null) throw new Error('projects must be an object');

    Object.entries(configData.projects).forEach(([projectName, p]: [string, any]) => {
        if (!p.path || typeof p.path !== 'string') throw new Error('path must be a string');
        if (p.disk !== undefined && typeof p.disk !== 'boolean') throw new Error('disk must be a boolean');
        if (!p.db || typeof p.db !== 'string') throw new Error('db must be a string');
        if (!p.thumbnailsOutput || typeof p.thumbnailsOutput !== 'string') throw new Error('thumbnailsOutput must be a string');
    });

    return new Config(configData);
}