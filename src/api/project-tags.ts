
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';

import { Config } from '../config-validation';
import * as utils from '../lib/utils';
import { JsonDbData, JsonDbInstance, UniversalResBody } from '../types';

export const projectTags = (app: express.Router) => {
    type PostTagsReqBody = {
        tags: {
            name: string;
            parentId?: null | number;
            rank?: number;
        }[];
    };

    app.post<{}, UniversalResBody, PostTagsReqBody>('/tags', async (req, res) => {
        const db = res.locals.db as JsonDbInstance;

        // @todo validate name
        // @todo validate parentId (tag must exist)
        // @todo validate rank (ranks with array must be unique)

        // @todo adjust ranks

        const data = await db.read();
        const tagsCount = data.tags.length;
        const tags = req.body.tags.map((t, i) => {
            return {
                name: t.name || '',
                parentId: t.parentId || null,
                // @todo allow custom ranks
                rank: tagsCount + i
            };
        });

        const dbRes = await db.insertMany('tags', tags);

        res.json({
            tags: dbRes,
        });
    });

    type PutTagsReqBody = {
        tags: {
            id: number;
            name?: string;
            parentId?: null | number;
            rank?: number;
        }[];
    };

    app.put<{}, UniversalResBody, PutTagsReqBody>('/tags', async (req, res) => {
        const db = res.locals.db as JsonDbInstance;

        // @todo validate name
        // @todo validate parentId (tag must exist)
        // @todo validate rank (ranks with array must be unique)

        await db.transaction(async tx => {
            const reqs = req.body.tags.map(t => {
                const body = {
                    name: t.name,
                    parentId: t.parentId,
                };

                return tx.update('tags', t.id, body);
            });

            await Promise.all(reqs);

            // @todo update ranks
        });

        const dataAfter = await db.read();

        res.json({
            tags: dataAfter.tags,
        });
    });

    type DeleteTagsReqBody = {
        tagsIds: number[];
    };

    app.delete<{}, UniversalResBody, DeleteTagsReqBody>('/tags', async (req, res) => {
        const db = res.locals.db as JsonDbInstance;

        // validate tags exist

        // cannot delete tags with children tags
        // cannot delete tags with assigned files

        await db.transaction(async tx => {
            const reqs = req.body.tagsIds.map(tagId => {
                return tx.delete('tags', tagId);
            });

            await Promise.all(reqs);
        });

        // @todo adjust ranks

        res.json({
            removedTagsIds: req.body.tagsIds,
        });
    });
}