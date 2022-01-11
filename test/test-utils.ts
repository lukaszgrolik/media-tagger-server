import * as should from 'should';

export async function promiseShouldThrow(cb: () => void | Promise<void>, msg?: string) {
    try {
        await cb();

        should.throws(() => {
            // empty here
        }, msg);
    }
    catch (err: unknown) {
        if (msg) {
            if (err instanceof Error) {
                should.equal(err.message, msg);
            }
            else {
                throw new Error(`Error message required: ${msg}`);
            }
        }
    }
}