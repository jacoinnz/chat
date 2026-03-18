import { checkRateLimit, applyRateLimit, rateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it("tracks remaining count accurately", () => {
    const key = `test-remaining-${Date.now()}`;
    const config = { limit: 3, windowMs: 60_000 };

    expect(checkRateLimit(key, config).remaining).toBe(2);
    expect(checkRateLimit(key, config).remaining).toBe(1);
    expect(checkRateLimit(key, config).remaining).toBe(0);
  });

  it("rejects requests exceeding the limit", () => {
    const key = `test-reject-${Date.now()}`;
    const config = { limit: 2, windowMs: 60_000 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("provides resetMs when rejected", () => {
    const key = `test-reset-${Date.now()}`;
    const config = { limit: 1, windowMs: 60_000 };

    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);

    expect(result.allowed).toBe(false);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(result.resetMs).toBeLessThanOrEqual(60_000);
  });

  it("allows requests after the window expires", () => {
    const key = `test-expire-${Date.now()}`;
    const config = { limit: 1, windowMs: 60_000 };

    checkRateLimit(key, config);
    expect(checkRateLimit(key, config).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(true);
  });

  it("uses sliding window — partial expiry restores capacity", () => {
    const key = `test-sliding-${Date.now()}`;
    const config = { limit: 2, windowMs: 10_000 };

    checkRateLimit(key, config); // t=0
    vi.advanceTimersByTime(5_000);
    checkRateLimit(key, config); // t=5000

    // At t=5000, both timestamps in window → remaining = 0
    expect(checkRateLimit(key, config).allowed).toBe(false);

    // Advance past first timestamp's window
    vi.advanceTimersByTime(5_001); // t=10001 — first timestamp expired

    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(true);
  });

  it("isolates keys from each other", () => {
    const key1 = `test-iso1-${Date.now()}`;
    const key2 = `test-iso2-${Date.now()}`;
    const config = { limit: 1, windowMs: 60_000 };

    checkRateLimit(key1, config);
    expect(checkRateLimit(key1, config).allowed).toBe(false);
    expect(checkRateLimit(key2, config).allowed).toBe(true);
  });
});

describe("applyRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when request is allowed", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-tenant-id": `apply-tenant-${Date.now()}`,
        "x-user-id": `apply-user-${Date.now()}`,
      },
    });
    const result = applyRateLimit(request, "search");
    expect(result).toBeNull();
  });

  it("returns 429 Response when rate limited", () => {
    const tenantId = `apply-tenant-429-${Date.now()}`;
    const userId = `apply-user-429-${Date.now()}`;
    const config = rateLimits.search; // limit: 30

    // Exhaust the limit
    for (let i = 0; i < config.limit; i++) {
      const req = new Request("http://localhost/api/test", {
        headers: { "x-tenant-id": tenantId, "x-user-id": userId },
      });
      applyRateLimit(req, "search");
    }

    const req = new Request("http://localhost/api/test", {
      headers: { "x-tenant-id": tenantId, "x-user-id": userId },
    });
    const response = applyRateLimit(req, "search");

    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
    expect(response!.headers.get("Retry-After")).toBeTruthy();
    expect(response!.headers.get("X-RateLimit-Limit")).toBe(String(config.limit));
    expect(response!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("uses 'unknown' for missing tenant/user headers", async () => {
    const request = new Request("http://localhost/api/test");
    const result = applyRateLimit(request, "userData");
    expect(result).toBeNull(); // first request should be allowed
  });
});

describe("rateLimits constants", () => {
  it("has expected tiers", () => {
    expect(rateLimits.search.limit).toBe(30);
    expect(rateLimits.adminWrite.limit).toBe(20);
    expect(rateLimits.adminRead.limit).toBe(60);
    expect(rateLimits.userData.limit).toBe(40);
  });

  it("all tiers have 60-second windows", () => {
    for (const tier of Object.values(rateLimits)) {
      expect(tier.windowMs).toBe(60_000);
    }
  });
});
