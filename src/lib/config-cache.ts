/** Simple in-memory TTL cache for tenant configuration. */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

// Singleton — survives hot reloads in dev
const globalForCache = globalThis as unknown as { configCache: TtlCache<Record<string, unknown>> };

export const configCache =
  globalForCache.configCache || new TtlCache<Record<string, unknown>>(5 * 60 * 1000);

if (process.env.NODE_ENV !== "production") globalForCache.configCache = configCache;
