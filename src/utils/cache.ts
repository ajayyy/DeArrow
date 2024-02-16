interface CacheRecord {
    lastUsed: number;
}

const cacheLimit = 2000;

export class DataCache<T extends string, V> {
    private cache: Record<string, V & CacheRecord>;
    private init: () => V;

    constructor(init: () => V) {
        this.cache = {};
        this.init = init;
    }

    public getFromCache(key: T): V & CacheRecord | undefined {
        return this.cache[key];
    }

    public setupCache(key: T): V & CacheRecord {
        if (!this.cache[key]) {
            this.cache[key] = {
                ...this.init(),
                lastUsed: Date.now()
            };

            if (Object.keys(this.cache).length > cacheLimit) {
                const oldest = Object.entries(this.cache).reduce((a, b) => a[1].lastUsed < b[1].lastUsed ? a : b);
                delete this.cache[oldest[0]];
            }
        }

        return this.cache[key];
    }

    public cacheUsed(key: T): boolean {
        if (this.cache[key]) this.cache[key].lastUsed = Date.now();

        return !!this.cache[key];
    }
}