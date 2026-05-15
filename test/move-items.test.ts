import 'mocha';
import should = require('should');
import { Adapters, getEmptyFileContents, SqliteStore, RecordId } from '../src/persistence/sqlite-store';

// function moveItem<T, S>(arr: T[], cb: (i: T) => S, items: S[], newIndex: number): T[] {
type ReorderElementsResult<T> = { output: T[]; changes: [T, number][] };
// type MoveItemsFn<T> = (arr: T[], items: T[], newIndex: number) => MoveItemsResult;

function reorderElements<T>(originArr: readonly T[], itemsToMove: readonly T[], newIndex: number): ReorderElementsResult<T> {
    if (!originArr.length) throw new Error('origin array must not be empty');
    if (!itemsToMove.length) throw new Error('items to move array must not be empty');
    if (newIndex < 0) throw new Error('newIndex must be greater than zero');
    if (newIndex > originArr.length) throw new Error('newIndex must be less or equal than origin array length');

    // @todo items must not contain an element at newIndex

    const arrTemp = originArr.slice();
    const newIndexCurrentItem = arrTemp[newIndex];

    itemsToMove.forEach(item => {
        const index = arrTemp.indexOf(item);
        // console.log('index', index)

        if (index !== -1) {
            arrTemp.splice(index, 1);
        }
    });
    // console.log('arrTemp 1', arrTemp)

    // const indexToMove = (() => {
    //     if (newIndex === originArr.length) return arrTemp.length;

    //     const index = arrTemp.indexOf(newIndexCurrentItem)
    //     return newIndex > index ? index + 1 : index;
    // })();
    const indexToMove = newIndex >= originArr.length ? originArr.length : arrTemp.indexOf(newIndexCurrentItem);
    // console.log('indexToMove', indexToMove)
    arrTemp.splice(indexToMove, 0, ...itemsToMove);
    // console.log('arrTemp 2', arrTemp)



    const changes: [T, number][] = [];

    arrTemp.forEach((item, i) => {
        const foundIndex = originArr.indexOf(item);

        if (i !== foundIndex) {
            changes.push([item, i]);
        }
    });

    return {
        output: arrTemp,
        changes: changes,
    };
}

describe('reorderElements', () => {
    const tests: { args: [any[], any[], number], expected: ReorderElementsResult<string | number>}[] = [
        // should throw
        // { args: [[], [], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },
        // { args: [[], ['a'], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },
        // { args: [['a', 'b', 'c', 'd'], [], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },

        { args: [['a', 'b', 'c', 'd'], ['a'], 1], expected: { output: ['a', 'b', 'c', 'd'], changes: [] } },
        { args: [['a', 'b', 'c', 'd'], ['a'], 2], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },
        { args: [['a', 'b', 'c', 'd'], ['b'], 0], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },

        { args: [['a', 'b', 'c', 'd'], ['a'], 2], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },

        { args: [['a', 'b', 'c', 'd'], ['d'], 2], expected: { output: ['a', 'b', 'd', 'c'], changes: [['d', 2], ['c', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['c'], 3], expected: { output: ['a', 'b', 'c', 'd'], changes: [] } },
        { args: [['a', 'b', 'c', 'd'], ['c'], 4], expected: { output: ['a', 'b', 'd', 'c'], changes: [['d', 2], ['c', 3]] } },
        // { args: [['a', 'b', 'c', 'd'], ['c'], 123], expected: { output: ['a', 'b', 'd', 'c'], changes: [['d', 2], ['c', 3]] } },

        { args: [['a', 'b', 'c', 'd'], ['c'], 0], expected: { output: ['c', 'a', 'b', 'd'], changes: [['c', 0], ['a', 1], ['b', 2]] } },
        { args: [['a', 'b', 'c', 'd'], ['c'], 1], expected: { output: ['a', 'c', 'b', 'd'], changes: [['c', 1], ['b', 2]]}},

        { args: [['a', 'b', 'c', 'd'], ['a', 'b'], 2], expected: { output: ['a', 'b', 'c', 'd'], changes: [] } },
        { args: [['a', 'b', 'c', 'd'], ['a', 'b'], 3], expected: { output: ['c', 'a', 'b', 'd'], changes: [['c', 0], ['a', 1], ['b', 2]] } },
        { args: [['a', 'b', 'c', 'd'], ['c', 'd'], 1], expected: { output: ['a', 'c', 'd', 'b'], changes: [['c', 1], ['d', 2], ['b', 3]] } },

        { args: [['a', 'b', 'c', 'd'], ['b', 'c', 'd'], 0], expected: { output: ['b', 'c', 'd', 'a'], changes: [['b', 0], ['c', 1], ['d', 2], ['a', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['a'], 3], expected: { output: ['b', 'c', 'a', 'd'], changes: [['b', 0], ['c', 1], ['a', 2]] } },
        { args: [['a', 'b', 'c', 'd'], ['a'], 4], expected: { output: ['b', 'c', 'd', 'a'], changes: [['b', 0], ['c', 1], ['d', 2], ['a', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['a', 'b', 'c'], 3], expected: { output: ['a', 'b', 'c', 'd'], changes: [] } },
        { args: [['a', 'b', 'c', 'd'], ['a', 'b', 'c'], 4], expected: { output: ['d', 'a', 'b', 'c'], changes: [['d', 0], ['a', 1], ['b', 2], ['c', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['d'], 0], expected: { output: ['d', 'a', 'b', 'c'], changes: [['d', 0], ['a', 1], ['b', 2], ['c', 3]] } },

        // {args: [['a', 'b', 'c', 'd'], ['e'], 0], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['e'], 1], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['e'], 4], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['e'], 5], expected: {output: [], changes: []}},

        // {args: [['a', 'b', 'c', 'd'], ['e', 'f'], 0], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['e', 'f'], 1], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['e', 'f'], 4], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['e', 'f'], 5], expected: {output: [], changes: []}},

        // {args: [['a', 'b', 'c', 'd'], ['b', 'f'], 0], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['a', 'f'], 1], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['a', 'f'], 4], expected: {output: [], changes: []}},
        // {args: [['a', 'b', 'c', 'd'], ['a', 'f'], 5], expected: {output: [], changes: []}},

        {
            args: [new Array(10).fill(undefined).map((_, i) => i), [7, 3, 8, 9], 2],
            expected: {
                output: [0, 1, 7, 3, 8, 9, 2, 4, 5, 6],
                changes: [[7, 2], [8, 4], [9, 5], [2, 6], [4, 7], [5, 8], [6, 9]],
            },
        },
        {
            args: [new Array(10).fill(undefined).map((_, i) => i), [7, 3, 8, 9], 5],
            expected: {
                output: [0, 1, 2, 4, 7, 3, 8, 9, 5, 6],
                changes: [[4, 3], [7, 4], [3, 5], [8, 6], [9, 7], [5, 8], [6, 9]],
            },
        },
        {
            args: [new Array(10).fill(undefined).map((_, i) => i), [0, 1, 6, 2], 4],
            expected: {
                output: [3, 0, 1, 6, 2, 4, 5, 7, 8, 9],
                changes: [[3, 0], [0, 1], [1, 2], [6, 3], [2, 4], [4, 5], [5, 6]],
            },
        },
    ];

    for (const t of tests) {
        const joinArr = (arr: (string | number)[]) => arr.join('');
        const changesStr = t.expected.changes.map(change => `${change[0]}->${change[1]}`).join(', ');
        const msg = `${joinArr(t.args[0])} - ${joinArr(t.args[1])} - ${t.args[2]} => ${joinArr(t.expected.output)} | ${changesStr}`;

        it(msg, () => {
            const res = reorderElements(t.args[0], t.args[1], t.args[2]);

            should(res).deepEqual(t.expected);
        });
    }

});

interface ReorderRecordsOpts<T, S> {
    ids: S[];
    newIndex: number;
    getId: (record: T) => S;
    getRank: (record: T) => number;
    findByIds: (ids: S[]) => Promise<T[]>;
    findByRankRange: (min: number, max: number) => Promise<T[]>;
    update?: (id: S, rank: number) => void | Promise<void>;
    updateMany?: (data: [S, number][]) => void | Promise<void>;
}

async function reorderRecords<T, S>(opts: ReorderRecordsOpts<T, S>): Promise<void> {
    const records = await opts.findByIds(opts.ids);
    const ranks = records.map(opts.getRank).concat(opts.newIndex);
    // console.log('ranks', ranks)
    const rankMin = Math.min(...ranks);
    const rankMax = Math.max(...ranks);
    const filesRange = await opts.findByRankRange(rankMin, rankMax);
    // console.log('filesRange', filesRange.map(f => opts.getRank(f)))

    // // @todo
    // if (filesRange.length === 0) {

    // }

    const filesRanked = filesRange.slice().sort((a, b) => opts.getRank(a) - opts.getRank(b));
    // console.log('filesRanked', filesRange.map(f => opts.getRank(f)))
    // console.log('opts.newIndex - rankMin', opts.newIndex - rankMin)

    const res = reorderElements(filesRanked.map(f => opts.getId(f)), opts.ids, opts.newIndex - rankMin);

    res.changes.forEach(change => {
        change[1] += rankMin;
    });

    if (opts.updateMany) {
        // console.log('res.changes', res.changes)
        await opts.updateMany(res.changes);

        return;
    }

    const optsUpdate = opts.update;
    if (optsUpdate) {
        const promises: (void | Promise<void>)[] = [];
        res.changes.forEach(change => {
            const promise = optsUpdate(change[0], rankMin + change[1]);
            promises.push(promise);
        });

        await Promise.all(promises);
    }
}

describe('reorderRecords', () => {

    // const idsToMove = [45, 13, 85, 90];
    // const newIndex = 15;

    // const dbFiles = ([] as { id: number; rank: number }[]);

    // const files = dbFiles.filter(f => idsToMove.includes(f.id));
    // const ranks = files.map(f => f.rank).concat(newIndex);
    // const rankMin = Math.min(...ranks);
    // const rankMax = Math.max(...ranks);
    // const filesRange = dbFiles.filter(f => f.rank >= rankMin && f.rank <= rankMax);
    // const filesRanked = filesRange.slice().sort((a, b) => b.rank - a.rank);

    // const res = moveItems(filesRanked.map(f => f.id), idsToMove, newIndex);

    // res.changes.forEach(change => {
    //     const file = dbFiles.find(f => f.id === change[0]);
    //     if (!file) throw new Error();

    //     file.rank = rankMin + change[1];
    // });

    const tests = [
        { ids: [2], newIndex: 0, result: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10] },
        { ids: [1], newIndex: 1, result: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { ids: [1], newIndex: 2, result: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10] },
        { ids: [10], newIndex: 8, result: [1, 2, 3, 4, 5, 6, 7, 8, 10, 9] },
        { ids: [9], newIndex: 9, result: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { ids: [9], newIndex: 10, result: [1, 2, 3, 4, 5, 6, 7, 8, 10, 9] },

        { ids: [3], newIndex: 0, result: [3, 1, 2, 4, 5, 6, 7, 8, 9, 10] },
        { ids: [1], newIndex: 2, result: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10] },
        { ids: [10], newIndex: 7, result: [1, 2, 3, 4, 5, 6, 7, 10, 8, 9] },
        { ids: [8], newIndex: 9, result: [1, 2, 3, 4, 5, 6, 7, 9, 8, 10] },

        // { ids: [5].map(id => id + 1), newIndex: 3, result: [0, 1, 2, 4, 5, 3, 6, 7, 8, 9] },
        // { ids: [3].map(id => id + 1), newIndex: 5, result: [0, 1, 2, 4, 3, 5, 6, 7, 8, 9] },

        // { ids: [7, 3, 8, 9].map(id => id + 1), newIndex: 5, result: [0, 1, 2, 4, 5, 7, 3, 8, 9, 6] }
    ];

    for (const t of tests) {
        const joinArr = (arr: (string | number)[]) => arr.join('');
        const msg = `${joinArr(t.ids)} - ${t.newIndex} => ${joinArr(t.result)}`;

        it(msg, async () => {
            interface DbRes {
                tags: {
                    id: RecordId;
                    createdAt: string;
                    updatedAt: string;
                    rank: number;
                }
            }

            const db = new SqliteStore<DbRes>({
                adapter: new Adapters.Memory({
                    db: JSON.stringify(getEmptyFileContents(['tags'])),
                }),
            });

            await db.insertMany('tags', new Array(10).fill(undefined).map((_, i) => {
                return { rank: i };
            }));

            // const d = await db.read();
            // console.log('data', d)

            await reorderRecords<{ id: number, rank: number }, number>({
                ids: t.ids,
                newIndex: t.newIndex,
                getId: rec => rec.id,
                getRank: rec => rec.rank,
                findByIds: async ids => {
                    const data = await db.read();
                    return data.tags.filter(t => ids.includes(t.id));
                },
                findByRankRange: async (min, max) => {
                    const data = await db.read();
                    return data.tags.filter(t => t.rank >= min && t.rank <= max);
                },
                // update: async (id, rank) => {
                //     return await db.collections.tags.update(id, {rank});
                // },
                updateMany: async (data) => {
                    return db.transaction(async tx => {
                        const promises = data.map(rec => {
                            return tx.update('tags', rec[0], { rank: rec[1] });
                        });

                        await Promise.all(promises);
                    });
                },
            });

            const data = await db.read();

            should(data.tags.length).equal(10);
            should(data.tags.slice().sort((a, b) => a.rank - b.rank).map(t => t.id)).deepEqual(t.result);
        });
    }

    // it('test', async () => {
    //     interface DbRes {
    //         tags: {
    //             id: RecordId;
    //             createdAt: string;
    //             updatedAt: string;
    //             rank: number;
    //         }
    //     }

    //     const db = new SqliteStore<DbRes>({
    //         adapter: new Adapters.Memory({
    //             db: JSON.stringify(getEmptyFileContents(['tags'])),
    //         }),
    //     });

    //     await db.insertMany('tags', new Array(10).fill(undefined).map((_, i) => {
    //         return { rank: i };
    //     }));

    //     // const d = await db.read();
    //     // console.log('data', d)

    //     await reorderRecords<{ id: number, rank: number }, number>({
    //         // ids: [7, 3, 8, 9].map(id => id + 1),
    //         ids: [3].map(id => id + 1),
    //         newIndex: 5,
    //         getId: rec => rec.id,
    //         getRank: rec => rec.rank,
    //         findByIds: async ids => {
    //             const data = await db.read();
    //             return data.tags.filter(t => ids.includes(t.id));
    //         },
    //         findByRankRange: async (min, max) => {
    //             const data = await db.read();
    //             return data.tags.filter(t => t.rank >= min && t.rank <= max);
    //         },
    //         // update: async (id, rank) => {
    //         //     return await db.collections.tags.update(id, {rank});
    //         // },
    //         updateMany: async (data) => {
    //             return db.transaction(async tx => {
    //                 const promises = data.map(rec => {
    //                     return tx.update('tags', rec[0], {rank: rec[1]});
    //                 });

    //                 await Promise.all(promises);
    //             });
    //         },
    //     });

    //     const data = await db.read();

    //     should.equal(data.tags.length, 10);
    //     // should.deepEqual(data.tags.map(t => t.rank), [0, 1, 2, 4, 5, 7, 3, 8, 9, 6]);
    //     should.deepEqual(data.tags.map(t => t.rank), [0, 1, 2, 4, 5, 3, 6, 7, 8, 9]);
    // });

});
