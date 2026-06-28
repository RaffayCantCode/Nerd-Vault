/**
 * Lightweight in-process server cache for expensive computations.
 * Safe for serverless — resets on cold start, hits are fast on warm instances.
 * Use this for TMDB/AniList/IGDB results and computed feeds.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflightStore = new Map<string, Promise<unknown>>();

/**
 * Returns the cached value if still fresh, otherwise runs the factory and caches the result.
 * Concurrent calls with the same key are coalesced — factory only runs once.
 */
export async function withServerCache<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > Date.now()) {
    return existing.value;
  }

  // Coalesce concurrent requests for the same key
  const inflight = inflightStore.get(key) as Promise<T> | undefined;
  if (inflight) return inflight;

  const promise = factory()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      inflightStore.delete(key);
      return value;
    })
    .catch((err) => {
      inflightStore.delete(key);
      throw err;
    });

  inflightStore.set(key, promise as Promise<unknown>);
  return promise;
}

/** Remove all entries whose key starts with the given prefix. */
export function invalidateServerCache(keyPrefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
      inflightStore.delete(key);
    }
  }
}

export function clearServerCache() {
  store.clear();
  inflightStore.clear();
}
