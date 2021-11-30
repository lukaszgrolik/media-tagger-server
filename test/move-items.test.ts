import 'mocha';
import * as should from 'should';

// function moveItem<T, S>(arr: T[], cb: (i: T) => S, items: S[], newIndex: number): T[] {
type MoveItemsResult<T> = { output: T[]; changes: [T, number][] };
// type MoveItemsFn<T> = (arr: T[], items: T[], newIndex: number) => MoveItemsResult;

function moveItems<T>(originArr: readonly T[], itemsToMove: readonly T[], newIndex: number): MoveItemsResult<T> {
    if (!originArr.length) throw new Error('origin array must not be empty');
    if (!itemsToMove.length) throw new Error('items to move array must not be empty');
    if (newIndex < 0) throw new Error('newIndex must be greater than zero');
    if (newIndex > originArr.length) throw new Error('newIndex must be less or equal than origin array length');

    // @todo origin arr items must be unique
    // @todo arr items must be found
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

    const indexToMove = (() => {
        if (newIndex === originArr.length) return arrTemp.length;

        const index = arrTemp.indexOf(newIndexCurrentItem)
        return newIndex > index ? index + 1 : index;
    })();
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

(async () => {

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

    await moveRecords<{id: number, rank: number}, number>({
        ids: [45, 13, 85, 90],
        newIndex: 15,
        getId: rec => rec.id,
        getRank: rec => rec.rank,
        findByIds: async ids => {
            return await db.collections.tags.filter(t => ids.includes(t.id));
        },
        findByRankRange: async (min, max) => {
            return await db.collections.tags.filter(t => t.rank >= min && t.rank <= max);
        },
        // update: async (id, rank) => {
        //     return await db.collections.tags.update(id, {rank});
        // },
        updateMany: async (data) => {
            const body = data.map(rec => {
                return {where: {id: rec[0]}, update: {rank: rec[1]}};
            });
            return await db.collections.tags.updateMany(body);
        },
    });

    interface Opts<T, S> {
        ids: S[];
        newIndex: number;
        getId: (record: T) => S;
        getRank: (record: T) => number;
        findByIds: (ids: S[]) => T[];
        findByRankRange: (min: number, max: number) => T[];
        update?: (id: S, rank: number) => void | Promise<void>;
        updateMany?: (data: [S, number][]) => void | Promise<void>;
    }

    async function moveRecords<T, S>(opts: Opts<T, S>): Promise<void> {
        const records = opts.findByIds(opts.ids);
        const ranks = records.map(opts.getRank).concat(opts.newIndex);
        const rankMin = Math.min(...ranks);
        const rankMax = Math.max(...ranks);
        const filesRange = opts.findByRankRange(rankMin, rankMax);
        const filesRanked = filesRange.slice().sort((a, b) => opts.getRank(b) - opts.getRank(a));

        const res = moveItems(filesRanked.map(f => opts.getId(f)), opts.ids, opts.newIndex);

        if (opts.updateMany) {
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
})();

describe('moveItems', () => {

    const tests: { args: [any[], any[], number], expected: MoveItemsResult<string>}[] = [
        // should throw
        // { args: [[], [], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },
        // { args: [[], ['a'], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },
        // { args: [['a', 'b', 'c', 'd'], [], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },

        { args: [['a', 'b', 'c', 'd'], ['a'], 1], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },
        { args: [['a', 'b', 'c', 'd'], ['b'], 0], expected: { output: ['b', 'a', 'c', 'd'], changes: [['b', 0], ['a', 1]] } },

        { args: [['a', 'b', 'c', 'd'], ['d'], 2], expected: { output: ['a', 'b', 'd', 'c'], changes: [['d', 2], ['c', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['c'], 3], expected: { output: ['a', 'b', 'd', 'c'], changes: [['d', 2], ['c', 3]] } },

        { args: [['a', 'b', 'c', 'd'], ['c'], 0], expected: { output: ['c', 'a', 'b', 'd'], changes: [['c', 0], ['a', 1], ['b', 2]] } },
        { args: [['a', 'b', 'c', 'd'], ['c'], 1], expected: { output: ['a', 'c', 'b', 'd'], changes: [['c', 1], ['b', 2]]}},

        { args: [['a', 'b', 'c', 'd'], ['a', 'b'], 2], expected: { output: ['c', 'a', 'b', 'd'], changes: [['c', 0], ['a', 1], ['b', 2]] } },
        { args: [['a', 'b', 'c', 'd'], ['c', 'd'], 1], expected: { output: ['a', 'c', 'd', 'b'], changes: [['c', 1], ['d', 2], ['b', 3]] } },

        { args: [['a', 'b', 'c', 'd'], ['b', 'c', 'd'], 0], expected: { output: ['b', 'c', 'd', 'a'], changes: [['b', 0], ['c', 1], ['d', 2], ['a', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['a'], 3], expected: { output: ['b', 'c', 'd', 'a'], changes: [['b', 0], ['c', 1], ['d', 2], ['a', 3]] } },
        { args: [['a', 'b', 'c', 'd'], ['a', 'b', 'c'], 3], expected: { output: ['d', 'a', 'b', 'c'], changes: [['d', 0], ['a', 1], ['b', 2], ['c', 3]] } },
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
    ];

    for (const t of tests) {
        const joinArr = (arr: string[]) => arr.join('');
        const changesStr = t.expected.changes.map(change => `${change[0]}->${change[1]}`).join(', ');
        const msg = `${joinArr(t.args[0])} - ${joinArr(t.args[1])} - ${t.args[2]} => ${joinArr(t.expected.output)} | ${changesStr}`;

        it(msg, () => {
            const res = moveItems(t.args[0], t.args[1], t.args[2]);

            should(res).deepEqual(t.expected);
        });
    }

});

