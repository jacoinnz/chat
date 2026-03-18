/**
 * In-memory sliding window rate limiter.
 * Tracks request timestamps per key (tenant+user) and rejects
 * requests that exceed the configured limit within the window.
 */

interface RateLimitConfig {
  /** Max requests allowed within the window. */
  limit: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, CLEANUP_INTERVAL);
  // Allow process to exit even if timer is running
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g. `${tenantId}:${userId}`)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup(config.windowMs);

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.limit) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      limit: config.limit,
      resetMs,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.limit - entry.timestamps.length,
    limit: config.limit,
    resetMs: config.windowMs,
  };
}

/** Pre-configured rate limits for different API tiers. */
export const rateLimits = {
  /** Search/chat: 30 requests per minute per user */
  search: { limit: 30, windowMs: 60_000 },
  /** Admin config writes: 20 requests per minute per user */
  adminWrite: { limit: 20, windowMs: 60_000 },
  /** Admin reads: 60 requests per minute per user */
  adminRead: { limit: 60, windowMs: 60_000 },
  /** User data (saved queries, favorites): 40 requests per minute per user */
  userData: { limit: 40, windowMs: 60_000 },
} as const;

/**
 * Apply rate limiting to a request. Returns a 429 Response if rate limit exceeded,
 * or null if the request is allowed. Headers include rate limit info.
 */
export function applyRateLimit(
  request: Request,
  tier: keyof typeof rateLimits
): Response | null {
  const tenantId = request.headers.get("x-tenant-id") || "unknown";
  const userId = request.headers.get("x-user-id") || "unknown";
  const key = `${tier}:${tenantId}:${userId}`;
  const config = rateLimits[tier];
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfterMs: result.resetMs,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.resetMs / 1000)),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
