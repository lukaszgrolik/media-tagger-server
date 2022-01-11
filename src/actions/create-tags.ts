
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';

import { Config } from '../config-validation';
import * as utils from '../lib/utils';
import { DbTagBody, JsonDbData, JsonDbInstance, TagResBody, UniversalResBody } from '../types';

export type CreateTagsReqBody = {
    tags: {
        name: string;
        parentId?: null | number;
        rank?: number;
    }[];
};

type Opts = {
    db: JsonDbInstance;
    body: CreateTagsReqBody;
};

export const createTags = async (opts: Opts): Promise<DbTagBody[]> => {
    // @todo validate name

    const data = await opts.db.read();

    // validate parentId (tag must exist)
    opts.body.tags
    .forEach(tag => {
        if (tag.parentId) {
            const found = data.tags.find(t => t.id === tag.parentId);

            if (!found) {
                throw new Error(`tag parent not found (parentId=${tag.parentId}`);
            }
        }
    });

    // @todo validate rank (ranks within array must be unique)

    // @todo adjust ranks

    const tagsCount = data.tags.length;
    const tags = opts.body.tags.map((t, i) => {
        return {
            name: t.name || '',
            parentId: t.parentId || null,
            // @todo allow custom ranks
            // @todo adjust rank when inside parent
            rank: tagsCount + i
        };
    });

    const dbRes = await opts.db.insertMany('tags', tags);

    return dbRes;
}