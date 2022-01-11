import { FileResBody, JsonDbInstance } from "../types";

export type UpdateFilesReqBody = {
    files: {
        id?: number;
        path?: string;
        description?: string;
        tagsIds?: number[];
        // @todo
        // newTags?: {name: string; parentId?: number | null}[];
    }[];
};

type Opts = {
    db: JsonDbInstance;
    body: UpdateFilesReqBody;
};

export const updateFiles = async (opts: Opts): Promise<FileResBody[]> => {
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
            const found = dataBeforeB.files.find(f => {
                if (body.id) return f.id === body.id;
                if (body.path) return f.path === body.path;
                return undefined;
            });

            // only possible when id given (not path)
            if (!found) throw new Error(`file not found (id=${body.id})`);

            // @todo validate tags exist
            body.tagsIds?.forEach(tagId => {
                const found = dataBeforeB.tags.find(t => t.id === tagId);

                if (!found) throw new Error(`tag not found (id=${tagId})`);
            });

            return tx.update('files', found.id, body);
        });

        return Promise.all(reqs);
    });

    return dbRes;
}