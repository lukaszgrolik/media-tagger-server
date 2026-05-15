import 'mocha';
import should = require('should');

import PromiseQueue from '../src/persistence/promise-queue';

class X {
    arr: number[] = [];

    async foo(x: number, delay: number) {
        // console.log('x1', x);
        const arr = this.arr.slice();

        // console.log('x2', x);
        await new Promise(res => {
            setTimeout(() => {
                // console.log('x3', x);
                arr.push(x);

                res(null);
            }, delay);
        });

        // console.log('x4', x);
        this.arr = arr;

        return {arr, x, delay};
    }
}

describe('PromiseQueue', () => {
    it('makes functions execute one after another', async () => {
        const x = new X();
        const pq = new PromiseQueue();
        await Promise.all(
            [
                () => x.foo(1, 50),
                () => x.foo(2, 25),
                () => x.foo(3, 0),
            ].map(pfn => {
                return pq.enqueue(pfn);
            })
        );

        should.equal(x.arr.length, 3);
        should.deepEqual(x.arr.sort((a, b) => a - b), [1, 2, 3]);
    });

    it('returns promise value', async () => {
        const x = new X();
        const pq = new PromiseQueue();

        const res = await pq.enqueue(() => {
            return x.foo(123, 10);
        });

        should.equal(res.x, 123);
    });

    it('returns promise value when multiple enqueued', async () => {
        const x = new X();
        const pq = new PromiseQueue();

        const res = await Promise.all(
            [
                () => x.foo(1, 50),
                () => x.foo(2, 25),
                () => x.foo(3, 0),
            ].map(pfn => {
                return pq.enqueue(pfn);
            })
        );

        should.equal(res.length, 3);
        should.equal(res[0].x, 1);
        should.equal(res[1].x, 2);
        should.equal(res[2].x, 3);
    });
})
