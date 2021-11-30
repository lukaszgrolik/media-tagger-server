import * as path from 'path';
import * as fs from 'fs';
import 'mocha';
import * as should from 'should';

type UpdateFilesBodyCb = {
    tagsIdsToSet?: number[];
    tagsIdsToRemove?: number[];
    tagsIdsToAdd?: number[];
}

interface UpdateFilesOpts {
    filesIds: number[];
    body: UpdateFilesBody;
    findTags: (tagsIds: number[]) => Promise<number[]>;
    createTags: (tagNames: string[]) => Promise<{id: number; name: string}[]>;
    updateFiles: (filesIds: number[], body: UpdateFilesBodyCb) => Promise<void>;
}

type UpdateFilesBody = {
    newTags?: string[];
} & ({
    type: 'set',
    tagsIds?: number[];
} | {
    type: 'update',
    tagsIdsToAdd?: number[];
    tagsIdsToRemove?: number[];
});

function updateFiles(opts: UpdateFilesOpts) {
    if (opts.body.type === 'set') {
        opts.body.tagsIds
    }
    else if (opts.body.type === 'update') {
        opts.body.tagsIdsToAdd
        opts.body.tagsIdsToRemove
    }
}

function validateTagsIds() {

}

describe('file', () => {
    describe('validateTagsIds', () => {
        it('returns non-existent tags');
        it('returns already existing tags');
    });

    describe('update', () => {
        it('throws when any filesIds not found');
        it('throws when newTags contains invalid values');
        it('throws when tagsIds contains non-existent tagsIds');
        it('throws when tagsIdsToAdd contains non-existent tagsIds');
        it('throws when tagsIdsToAdd and tagsIdsToRemove contains the same tagId');
        it('does nothing when tagsIdsToAdd contains tagsIds already assigned to file');
        it('does nothing when tagsIdsToRemove contains tagsIds not assigned to file');
        it('updates all files with tagsIds');
        it('updates all files with newTags');
        it('updates all files with tagsIds & newTags');
        it('updates all files with tagsIdsToAdd');
        it('updates all files with tagsIdsToRemove');
        it('updates all files with tagsIdsToAdd & tagsIdsToRemove');
        it('updates all files with tagsIdsToAdd & newTags');
        it('updates all files with tagsIdsToRemove & newTags');
        it('updates all files with tagsIdsToAdd, tagsIdsToRemove & newTags');
    });

    describe('delete', () => {

    });
});

describe('lists', () => {
    // create, update, delete
    // sorting
});