import { JsonDB } from "./json-db/json-db";

export type JsonDbInstance = JsonDB<JsonDbData>;

export type DbFileBody = {
    id: number;
    createdAt: string;
    updatedAt: string;
    path: string;
    description: string;
    tagsIds: number[];
};

export type DbTagBody = {
    id: number;
    createdAt: string;
    updatedAt: string;
    name: string;
    parentId: number | null;
    rank: number;
};

export type JsonDbData = {
    files: DbFileBody;
    tags: DbTagBody;
};

export type TagResBody = {
    id: number;
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    parentId?: null | number;
    rank?: number;
};

export type FileResBody = {
    id: number;
    createdAt?: string;
    updatedAt?: string;
    path?: string;
    description?: string;
    tagsIds?: number[];
};

export type UniversalResBody = {
    tags?: TagResBody[];
    files?: FileResBody[];

    removedTagsIds?: number[];
    removedFilesIds?: number[];
};