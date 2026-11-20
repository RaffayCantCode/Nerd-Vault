type CacheEntry<T> = {
  value: T;
  freshUntil: number;
  staleUntil: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private maxItems = 1500;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.staleUntil) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number = 1000 * 60 * 15, staleTtlMs?: number): void {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    const now = Date.now();
    const staleWindow = staleTtlMs ?? Math.max(ttlMs * 4, 1000 * 60 * 60);
    this.cache.set(key, {
      value,
      freshUntil: now + ttlMs,
      staleUntil: now + staleWindow,
    });
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 1000 * 60 * 15,
    staleTtlMs?: number
  ): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (entry) {
      // Fresh cache hit: instant return
      if (now <= entry.freshUntil) {
        return entry.value;
      }
      // Stale-while-revalidate: return stale immediately and refresh in background
      if (now <= entry.staleUntil) {
        if (!this.inFlight.has(key)) {
          const refreshPromise = fetcher()
            .then((val) => {
              this.set(key, val, ttlMs, staleTtlMs);
              this.inFlight.delete(key);
              return val;
            })
            .catch(() => {
              this.inFlight.delete(key);
            });
          this.inFlight.set(key, refreshPromise);
        }
        return entry.value;
      }
      this.cache.delete(key);
    }

    const existingPromise = this.inFlight.get(key) as Promise<T> | undefined;
    if (existingPromise) return existingPromise;

    const promise = fetcher()
      .then((val) => {
        this.set(key, val, ttlMs, staleTtlMs);
        this.inFlight.delete(key);
        return val;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise as Promise<unknown>);
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
  fetcher?: () => Promise<T>,
  timeoutMs: number = 3800
): Promise<T> {
  return mediaCache.getOrFetch<T>(
    urlOrKey,
    fetcher ||
      (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(urlOrKey, { signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return (await res.json()) as T;
        } finally {
          clearTimeout(timer);
        }
      }),
    ttlMs
  );
}
