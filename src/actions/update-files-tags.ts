import { DbFileBody, DbTagBody, FileResBody, JsonDbInstance } from "../types";
import { createTags } from "./create-tags";

export type PutFilesTagsReqBody = {
    ids?: number[];
    filePaths?: string[];
    addedTagsIds?: number[];
    removedTagsIds?: number[];
    newTags?: (string | { name: string; parentId: number })[]
};

type Opts = {
    db: JsonDbInstance;
    body: PutFilesTagsReqBody;
};

export const updateFilesTags = async (opts: Opts): Promise<{tags: DbTagBody[]; files: DbFileBody[]}> => {
    const isEmpty = <T>(arr: T[] | undefined | null) => {
        return !arr || arr.length === 0;
    };

    // validate body contains either id or path
    if (isEmpty(opts.body.filePaths) && isEmpty(opts.body.ids)) {
        throw new Error(`at least one file id or path required`);
    }

    if (isEmpty(opts.body.addedTagsIds) && isEmpty(opts.body.removedTagsIds) && isEmpty(opts.body.newTags)) {
        throw new Error(`at least one tag to add or remove required`);
    }

    const hasUniqueValues = <T>(arr: T[]): boolean => {
        const temp: T[] = [];

        for (const item of arr) {
            if (temp.includes(item)) return false;

            temp.push(item);
        }

        return true;
    };

    // validate unique ids arr values
    if (opts.body.ids && hasUniqueValues(opts.body.ids) === false) {
        throw new Error(`array must contain unique values: ids`);
    }

    // validate unique filePaths arr values
    if (opts.body.filePaths && hasUniqueValues(opts.body.filePaths) === false) {
        throw new Error(`array must contain unique values: filePaths`);
    }

    if (opts.body.addedTagsIds && hasUniqueValues(opts.body.addedTagsIds) === false) {
        throw new Error(`array must contain unique values: addedTagsIds`);
    }

    if (opts.body.removedTagsIds && hasUniqueValues(opts.body.removedTagsIds) === false) {
        throw new Error(`array must contain unique values: removedTagsIds`);
    }

    // validate addedTagsIds & removedTagsIds don't contain the same tag
    if (opts.body.addedTagsIds?.length && opts.body.removedTagsIds?.length) {
        opts.body.addedTagsIds?.forEach(addedTagId => {
            opts.body.removedTagsIds?.forEach(removedTagId => {
                if (addedTagId === removedTagId) {
                    throw new Error(`tag cannot be both added and removed (id=${addedTagId})`);
                }
            });
        });
    }

    const data = await opts.db.read();

    // validate tags exist
    [...(opts.body.addedTagsIds || []), ...(opts.body.removedTagsIds || [])].forEach(tagId => {
        const found = data.tags.find(t => t.id === tagId);
        if (!found) throw new Error(`tag not found (id=${tagId})`);
    });

    const files: DbFileBody[] = [];

    // validate file ids exist
    opts.body.ids?.forEach(fileId => {
        const found = data.files.find(f => f.id === fileId);
        if (!found) throw new Error(`file not found (id=${fileId})`);

        files.push(found);
    });

    opts.body.filePaths?.forEach(fp => {
        const found = data.files.find(f => f.path === fp);

        if (found) {
            if (files.map(f => f.id).includes(found.id)) {
                throw new Error(`file already given as id (path="${fp}", id=${found.id})`);
            }

            files.push(found);
        }
    });

    const dbRes = await opts.db.transaction(async tx => {
        // create unexisting files by file path

        if (opts.body.filePaths?.length) {
            const unexistingFilePaths = opts.body.filePaths.filter(fp => {
                const found = data.files.find(f => f.path === fp);

                return !found;
            });

            if (unexistingFilePaths.length) {
                const fileBodyArr = unexistingFilePaths.map(fp => {
                    return {
                        path: fp,
                        description: '',
                        tagsIds: [],
                    };
                });

                const filesInsertRes = await tx.insertMany('files', fileBodyArr);
                files.push(...filesInsertRes);
            }
        }

        // create tags
        const createdTags = await (async () => {
            if (opts.body.newTags?.length) {
                const tagBodyArr = opts.body.newTags.map(t => {
                    if (typeof t === 'string') return { name: t };
                    else return t;
                });

                return await createTags({
                    db: tx,
                    body: {
                        tags: tagBodyArr
                    }
                });
            }

            return [];
        })();

        const reqs = files.map(file => {
            const tagsIds = file.tagsIds.slice();

            opts.body.removedTagsIds?.forEach(tagId => {
                const index = tagsIds.indexOf(tagId);
                if (index !== -1) {
                    tagsIds.splice(index, 1);
                }
            });

            opts.body.addedTagsIds?.forEach(tagId => {
                if (tagsIds.includes(tagId) === false) {
                    tagsIds.push(tagId);
                }
            });

            if (createdTags.length) {
                tagsIds.push(...createdTags.map(t => t.id));
            }

            return tx.update('files', file.id, {
                tagsIds,
            });
        });

        return {
            tags: createdTags,
            files: await Promise.all(reqs),
        };
    });

    return dbRes;
}