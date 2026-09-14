import { UnifiedMedia } from "./api";

/**
 * High-speed in-memory client entity cache for UnifiedMedia items.
 * Allows instant 0ms transitions when opening media details from cards.
 */
class MediaEntityCache {
  private items = new Map<string, UnifiedMedia>();
  private apiCache = new Map<string, { data: any; expiresAt: number }>();

  set(item: UnifiedMedia): void {
    if (!item || !item.id) return;
    const existing = this.items.get(item.id) || (item.slug ? this.items.get(item.slug) : undefined);
    const merged: UnifiedMedia = existing
      ? {
          ...existing,
          ...item,
          runtime: item.runtime || existing.runtime,
          airingStatus: item.airingStatus || existing.airingStatus,
          franchise: item.franchise || existing.franchise,
          similar: item.similar || existing.similar,
        }
      : item;
    this.items.set(item.id, merged);
    if (merged.slug) {
      this.items.set(merged.slug, merged);
    }
  }

  setMany(items: UnifiedMedia[]): void {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      this.set(item);
    }
  }

  get(idOrSlug: string): UnifiedMedia | null {
    if (!idOrSlug) return null;
    return this.items.get(idOrSlug) || null;
  }

  has(idOrSlug: string): boolean {
    if (!idOrSlug) return false;
    return this.items.has(idOrSlug);
  }

  // Generic query cache for API GET requests (TTL in ms, default 5 mins)
  getCachedQuery<T>(key: string): T | null {
    const entry = this.apiCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.apiCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  setCachedQuery<T>(key: string, data: T, ttlMs: number = 1000 * 60 * 5): void {
    if (this.apiCache.size > 500) {
      const firstKey = this.apiCache.keys().next().value;
      if (firstKey) this.apiCache.delete(firstKey);
    }
    this.apiCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.items.clear();
    this.apiCache.clear();
  }
}

export const mediaCache = new MediaEntityCache();
