import { FileResBody, JsonDbInstance } from "../types";

export type UpdateFilesReqBody = {
    files: {
        id?: number;
        path?: string;
        description?: string;
        tagsIds?: number[];
        // @todo
        // newTags?: {name: string; parentId?: number | null}[];
        meta?: {
            poster?: string;
            thumbnails?: {[height: string]: string};
            mtime?: string;
            fileSize?: number;
        };
    }[];
};

type Opts = {
    db: JsonDbInstance;
    body: UpdateFilesReqBody;
};

const validateAllowedKeys = (obj: { [key: string]: any }, allowed: string[]) => {
    Object.keys(obj).forEach(key => {
        if (allowed.includes(key) === false) {
            throw new Error(`unexpected key: ${key}`);
        }
    });
};

export const updateFiles = async (opts: Opts): Promise<FileResBody[]> => {
    validateAllowedKeys(opts.body, ['files'])
    opts.body.files.forEach(file => {
        validateAllowedKeys(file, ['id', 'path', 'description', 'tagsIds', 'meta']);
        if (file.meta) validateAllowedKeys(file.meta, ['mtime', 'fileSize', 'poster', 'thumbnails']);
    });

    // validate body contains either id or path
    opts.body.files.forEach(body => {
        if (!body.id && !body.path) {
            throw new Error(`identifier missing: either id or path required`);
        }

        if (body.id && body.path) {
            throw new Error(`invalid identifier: either id or path allowed (both given: id=${body.id}, path=${body.path})`);
        }
    });

    const dataBeforeA = await opts.db.read();
    const dbRes = await opts.db.transaction(async tx => {
        // create files if not found when accessed by path
        {
            const bodyArr = opts.body.files
                .filter(body => body.path)
                .filter(body => {
                    const found = dataBeforeA.files.find(f => {
                        return f.path === body.path;
                    });

                    return !found;
                })
                .map(body => {
                    return {
                        path: body.path as string,
                        description: body.description || '',
                        tagsIds: body.tagsIds || [],
                    };
                }).map(f => f);

            await tx.insertMany('files', bodyArr);
        }

        const dataBeforeB = await tx.read();
        const reqs = opts.body.files.map(body => {
            // validate files exist
            const foundFile = dataBeforeB.files.find(f => {
                if (body.id) return f.id === body.id;
                if (body.path) return f.path === body.path;
                return undefined;
            });

            // only possible when id given (not path)
            if (!foundFile) throw new Error(`file not found (id=${body.id})`);

            // validate tags exist
            body.tagsIds?.forEach(tagId => {
                const foundTag = dataBeforeB.tags.find(t => t.id === tagId);

                if (!foundTag) throw new Error(`tag not found (id=${tagId})`);
            });

            // overwriteObjectValues=false for the meta object
            return tx.update('files', foundFile.id, body, {overwriteObjectValues: false});
        });

        return Promise.all(reqs);
    });

    return dbRes;
}