export default class PromiseQueue {
    private queue: { promiseFn: () => Promise<any>; resolve: Function, reject: Function }[] = [];
    private pendingPromise = false;

    private workingOnPromise = false;


    enqueue<T>(promiseFn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({
                promiseFn,
                resolve,
                reject,
            });

            this.dequeue();
        });
    }

    private async dequeue() {
        if (this.workingOnPromise) {
            return false;
        }

        const item = this.queue.shift();
        if (!item) {
            return false;
        }

        try {
            this.workingOnPromise = true;

            try {
                const promise = await item.promiseFn();

                this.workingOnPromise = false;
                item.resolve(promise);
                this.dequeue();
            }
            catch (err) {
                this.workingOnPromise = false;
                item.reject(err);
                this.dequeue();
            }
        }
        catch (err) {
            this.workingOnPromise = false;
            item.reject(err);
            this.dequeue();
        }

        return true;
    }
}