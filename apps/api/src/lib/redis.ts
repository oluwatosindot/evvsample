// In-memory cache for development (no Redis required)
// Replace with ioredis for production
const cache = new Map<string, { value: string; expiresAt: number | null }>();

export const redis = {
  async get(key: string): Promise<string | null> {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<void> {
    const expiresAt = mode === "EX" && ttl ? Date.now() + ttl * 1000 : null;
    cache.set(key, { value, expiresAt });
  },

  async del(key: string): Promise<void> {
    cache.delete(key);
  },
};
