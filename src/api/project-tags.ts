
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import * as yargs from 'yargs';

import { Config } from '../config-validation';
import * as utils from '../lib/utils';
import { JsonDbData, JsonDbInstance, UniversalResBody } from '../types';
import { createTags, CreateTagsReqBody } from '../actions/create-tags';

export const projectTags = (app: express.Router) => {
    app.post<{}, UniversalResBody, CreateTagsReqBody>('/tags', async (req, res, next) => {
        const db = res.locals.db as JsonDbInstance;

        try {
            const dbRes = await createTags({db, body: req.body});

            res.json({
                tags: dbRes,
                // @todo handle new tags
                // tags: ...
            });
        }
        catch (err: unknown) {
            next(err);
        }
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
                    // @todo update rank and adjust if changed parent
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