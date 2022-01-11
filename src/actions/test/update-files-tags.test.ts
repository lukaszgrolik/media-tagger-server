import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';
import { updateFilesTags } from '../update-files-tags';
import { JsonDbData, JsonDbInstance } from '../../types';
import { Adapters, getEmptyFileContents, JsonDB } from '../../json-db/json-db';
import { promiseShouldThrow } from '../../../test/test-utils';

interface Db {
    files: {
        id: number;
        path: string;
        description: string;
        tagsIds: number[];
        //
        meta: {
            // hash: string;
            mtime: number;
            fileSize: number;
            displaySize: undefined | [number, number];
            poster: undefined | null | string;
            thumbnails: undefined | {
                path: string;
                size: [number, number];
            }[];
        };
    }[];
}

function getEmptyDbContentRaw() {
    const data = getEmptyFileContents(['tags', 'files']);

    return JSON.stringify(data);
}

describe('actions/update-files-tags', () => {
    const db = new JsonDB<JsonDbData>({
        adapter: new Adapters.Memory({
            db: getEmptyDbContentRaw(),
        }),
    });

    beforeEach(async () => {
        await db.insertMany('tags', [
            {name: 'tag1', parentId: null, rank: 0},
            {name: 'tag2', parentId: null, rank: 1},
            {name: 'tag3', parentId: null, rank: 2},
            {name: 'tag4', parentId: null, rank: 3},
            {name: 'tag5', parentId: null, rank: 4},
        ]);
        await db.insertMany('files', [
            {path: 'file1', description: '', tagsIds: []},
            {path: 'file2', description: '', tagsIds: []},
            {path: 'file3', description: '', tagsIds: []},
            {path: 'file4', description: '', tagsIds: []},
            {path: 'file5', description: '', tagsIds: []},
        ]);
    });

    afterEach(async () => {
        await db.clear();
    });

    describe('validation', () => {
        it('throws if both body.ids and body.filePaths are empty', async () => {
            const errMsg = 'at least one file id or path required';

            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        addedTagsIds: [1]
                    },
                });
            }, errMsg);

            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [],
                        filePaths: [],
                        addedTagsIds: [1]
                    },
                });
            }, errMsg);

            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [],
                        addedTagsIds: [1]
                    },
                });
            }, errMsg);
        });

        it('throws if all body.addedTagsIds, body.removedTagsIds and body.newTags are empty', async () => {
            const errMsg = 'at least one tag to add or remove required';

            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                    },
                });
            }, errMsg);

            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        addedTagsIds: [],
                        removedTagsIds: [],
                        newTags: [],
                    },
                });
            }, errMsg);

            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        addedTagsIds: [],
                    },
                });
            }, errMsg);
        });

        it('throws if body.ids has duplicated file ID', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1, 2, 3, 1, 4],
                        addedTagsIds: [1],
                    },
                });
            }, 'array must contain unique values: ids');
        });

        it('throws if body.filePaths has duplicated values', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        filePaths: ['foo', 'bar', 'foo', 'baz'],
                        addedTagsIds: [1],
                    },
                });
            }), 'array must contain unique values: filePaths';
        });

        it('throws if body.addedTagsIds has duplicated tag ID', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        addedTagsIds: [1, 2, 3, 1, 4],
                    },
                });
            }, 'array must contain unique values: addedTagsIds');
        });

        it('throws if body.removedTagsIds has duplicated tag ID', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        removedTagsIds: [1, 2, 3, 1, 4],
                    },
                });
            }, 'array must contain unique values: removedTagsIds');
        });

        it('throws if body.addedTagsIds and body.removedTagsIds contain the same tag ID', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        addedTagsIds: [1, 2, 3, 4],
                        removedTagsIds: [2, 5]
                    },
                });
            }, `tag cannot be both added and removed (id=2)`);
        });

        it('throws if body.addedTagsIds contain tag ID of non-existing tag', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        addedTagsIds: [1, 999],
                    },
                });
            }, `tag not found (id=999)`);
        });

        it('throws if body.removedTagsIds contain tag ID of non-existing tag', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1],
                        removedTagsIds: [1, 999],
                    },
                });
            }, `tag not found (id=999)`);
        });

        it('throws if body.ids contain tag ID of non-existing file', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1, 100],
                        addedTagsIds: [1],
                    },
                });
            }, `file not found (id=100)`);
        });

        it('throws if body.filePaths contain existing file which ID is also present in body.ids', async () => {
            await promiseShouldThrow(async () => {
                await updateFilesTags({
                    db,
                    body: {
                        ids: [1, 2],
                        filePaths: ['file2'],
                        addedTagsIds: [1],
                    },
                });
            }, `file already given as id (path="file2", id=2)`);
        });
    });

    describe('finding/creating files', () => {
        it('finds existing files by body.ids');
        it('finds existing files by body.filePaths');
        it('finds existing files by both body.ids and body.filePaths');
        it('creates files for body.filePaths that do not point to existing files');
        it('finds existing files by both body.ids and body.filePaths and creates non-existing files from body.filePaths');
    });

    describe('managing tags', () => {
        describe('adding tags', () => {
            it('assigns tags using body.addedTagsIds');
            it('does not assign tag if already assigned to file');
            it('returns modified files with assigned tags');
        });

        describe('removing tags', () => {
            it('removes tags using body.removedTagsIds');
            it('does not remove tag if not assigned to file');
            it('returns modified files with removed tags');
        });

        describe('creating tags', () => {
            it('creates tags from body.newTags by string');
            it('creates tags from body.newTags by object');
            it('returns modified files with assigned tags and newly created tags');
        });

        describe('mixed', () => {
            it('assigns existing tags and removes existing tags');

            it('assigns existing tags, assigns new tags and removes existing tags', async () => {
                await db.update('files', 1, {tagsIds: [1, 2, 3, 4, 5]})
                await db.update('files', 2, {tagsIds: [4, 5]})
                await db.update('files', 3, {tagsIds: [1, 4]})

                const res = await updateFilesTags({
                    db,
                    body: {
                        ids: [1, 2],
                        filePaths: ['file3', 'file6', 'file7'],
                        addedTagsIds: [1, 2],
                        removedTagsIds: [4, 5],
                        newTags: ['tag6', {name: 'tag7', parentId: 1}]
                    },
                });

                const data = await db.read();

                should(data.files.length).equal(7);
                should(data.tags.length).equal(7);

                should(data.files[5].path).equal('file6');
                should(data.files[6].path).equal('file7');

                should(data.files[0].tagsIds).deepEqual([1, 2, 3, 6, 7]);
                should(data.files[1].tagsIds).deepEqual([1, 2, 6, 7]);
                should(data.files[2].tagsIds).deepEqual([1, 2, 6, 7]);
                should(data.files[3].tagsIds).deepEqual([]);
                should(data.files[4].tagsIds).deepEqual([]);
                should(data.files[5].tagsIds).deepEqual([1, 2, 6, 7]);
                should(data.files[6].tagsIds).deepEqual([1, 2, 6, 7]);

                should(data.tags[5].name).equal('tag6');
                should(data.tags[6].name).equal('tag7');

                should(res.files.length).equal(5);
                should(res.tags.length).equal(2);

                should(res.files.map(f => {
                    return {
                        id: f.id,
                        path: f.path,
                        tagsIds: f.tagsIds
                    };
                })).deepEqual([
                    {id: 1, path: 'file1', tagsIds: [1, 2, 3, 6, 7]},
                    {id: 2, path: 'file2', tagsIds: [1, 2, 6, 7]},
                    {id: 3, path: 'file3', tagsIds: [1, 2, 6, 7]},
                    {id: 6, path: 'file6', tagsIds: [1, 2, 6, 7]},
                    {id: 7, path: 'file7', tagsIds: [1, 2, 6, 7]},
                ]);

                should(res.tags.map(t => {
                    return {
                        id: t.id,
                        name: t.name,
                        parentId: t.parentId,
                    };
                })).deepEqual([
                    {id: 6, name: 'tag6', parentId: null},
                    {id: 7, name: 'tag7', parentId: 1},
                ]);
            });

            it('returns modified files with assigned and removed tags and newly created tags');
        });
    });
});