import { JsonDB } from "./json-db/json-db";

export type JsonDbInstance = JsonDB<JsonDbData>;

export type JsonDbData = {
    files: {
        id: number;
        createdAt: string;
        updatedAt: string;
        path: string;
        description: string;
        tagsIds: number[];
    };
    tags: {
        id: number;
        createdAt: string;
        updatedAt: string;
        name: string;
        parentId: number | null;
        rank: number;
    }
};

export type UniversalResBody = {
    tags?: {
        id: number;
        createdAt?: string;
        updatedAt?: string;
        parentId?: null | number;
        rank?: number;
    }[];
    files?: {
        id: number;
        createdAt?: string;
        updatedAt?: string;
        path?: string;
        description?: string;
        tagsIds?: number[];
    }[];
    removedTagsIds?: number[];
};