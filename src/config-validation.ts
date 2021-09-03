export interface ConfigProject {
    path: string;
    disk?: boolean;
    db: string;
    thumbnailsOutput: string;
}

export interface Config {
    port: number;
    projects: {[key: string]: ConfigProject};
}

export function validateConfig(config: any): Config {
    if (typeof config !== 'object' || config === null) throw new Error('config must be an object');

    if (!config.port || typeof config.port !== 'number') throw new Error('port must be a number');
    if (!config.projects || typeof config.projects !== 'object' || config.project === null) throw new Error('projects must be an object');

    Object.entries(config.projects).forEach(([projectName, p]: [string, any]) => {
        if (!p.path || typeof p.path !== 'string') throw new Error('path must be a string');
        if (p.disk !== undefined && typeof p.disk !== 'boolean') throw new Error('disk must be a boolean');
        if (!p.db || typeof p.db !== 'string') throw new Error('db must be a string');
        if (!p.thumbnailsOutput || typeof p.thumbnailsOutput !== 'string') throw new Error('thumbnailsOutput must be a string');
    });

    return config as Config;
}