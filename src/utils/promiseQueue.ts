export class PromiseQueue<T> {
    private queue: Array<{
        callback: () => unknown;
        key: T;
    }> = [];
    private queueCallbacks: Record<string, () => unknown> = {};
    private activeCount = 0;

    private queueClaims: Set<T> = new Set();

    constructor(private activePromisesMax: number) {}

    public waitForSpotInQueue(key: T): Promise<void> {
        this.queueClaims.add(key);

        if (this.activeCount++ >= this.activePromisesMax) {
            return new Promise((resolve) => {
                this.queue.push({
                    callback: resolve,
                    key
                });
                this.queueCallbacks[key as string] = resolve;
            });
        }

        return Promise.resolve();
    }

    public nextInQueue(key: T) {
        // Already been removed
        if (!this.queueClaims.has(key)) return;
        
        this.queueClaims.delete(key);

        const top = this.queue.shift();
        if (top) {
            top.callback();
            this.removePromise(top.key);
        }

        this.activeCount--;
    }

    public removePromise(key: T): void {
        delete this.queueCallbacks[key as string];
    }

    public usePromiseEarly(key: T): void {
        this.queueCallbacks[key as string]?.();
        this.removePromise(key);
        this.queueClaims.delete(key);

        for (const i in this.queue) {
            if (this.queue[i].key === key) {
                this.queue.splice(parseInt(i), 1);
                this.activeCount--;

                break;
            }
        }
    }
}