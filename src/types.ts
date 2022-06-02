import { JsonDB } from "./json-db/json-db";

export type JsonDbInstance = JsonDB<JsonDbData>;

export type DbFileBody = {
    id: number;
    createdAt: string;
    updatedAt: string;
    path: string;
    description: string;
    tagsIds: number[];
    meta?: {
        poster?: string;
        mtime?: string;
        fileSize?: number;
        // fileSize: number;
        // displaySize: undefined | [number, number];
        // poster: undefined | null | string;
        // thumbnails: undefined | {
        //     path: string;
        //     size: [number, number];
        // }[];
    };
};

export type DbTagBody = {
    id: number;
    createdAt: string;
    updatedAt: string;
    name: string;
    parentId: number | null;
    rank: number;
    color?: string;
};

export type JsonDbData = {
    files: DbFileBody;
    tags: DbTagBody;
};

//
//
//
//
//

export type TagResBody = {
    id: number;
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    parentId?: null | number;
    rank?: number;
    color?: string;
};

export type FileResBody = {
    id: number;
    createdAt?: string;
    updatedAt?: string;
    path?: string;
    description?: string;
    tagsIds?: number[];
    meta?: {
        poster?: string;
        mtime?: string;
        fileSize?: number;
    };
};

export type UniversalResBody = {
    tags?: TagResBody[];
    files?: FileResBody[];

    removedTagsIds?: number[];
    removedFilesIds?: number[];
};