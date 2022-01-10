import * as path from 'path';

export type ConfigProject = {
    path: string;
    disk?: boolean;
    db: string;
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
        return path.resolve(__dirname, this.projects[projectName].path);
    }

    getThumbnailsFolderPath(projectName: string) {
        return path.resolve(__dirname, this.projects[projectName].thumbnailsOutput);
    }

    getDbPath(projectName: string) {
        return path.resolve(__dirname, this.projects[projectName].db);
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