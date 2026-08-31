type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private maxItems = 1000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number = 1000 * 60 * 15): void {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 1000 * 60 * 15): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const existingPromise = this.inFlight.get(key) as Promise<T> | undefined;
    if (existingPromise) return existingPromise;

    const promise = fetcher()
      .then((val) => {
        this.set(key, val, ttlMs);
        this.inFlight.delete(key);
        return val;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const mediaCache = new MemoryCache();

export async function fetchWithCache<T = any>(
  urlOrKey: string,
  ttlMs: number = 1000 * 60 * 15,
  fetcher?: () => Promise<T>
): Promise<T> {
  return mediaCache.getOrFetch(
    urlOrKey,
    fetcher || (async () => {
      const res = await fetch(urlOrKey);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    }),
    ttlMs
  );
}
