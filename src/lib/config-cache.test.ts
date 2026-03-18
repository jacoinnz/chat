import { TtlCache } from "./config-cache";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a missing key", () => {
    const cache = new TtlCache<string>();
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("stores and retrieves a value", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("stores objects correctly", () => {
    const cache = new TtlCache<{ foo: number }>();
    cache.set("key1", { foo: 42 });
    expect(cache.get("key1")).toEqual({ foo: 42 });
  });

  it("returns null after TTL expires", () => {
    const cache = new TtlCache<string>(1000); // 1 second TTL
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(999);
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(2);
    expect(cache.get("key1")).toBeNull();
  });

  it("uses default TTL of 5 minutes", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1");

    vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(2 * 60 * 1000); // 6 minutes total
    expect(cache.get("key1")).toBeNull();
  });

  it("invalidates a specific key", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.invalidate("key1");
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBe("value2");
  });

  it("invalidateAll clears all entries", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key3", "value3");

    cache.invalidateAll();
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
    expect(cache.get("key3")).toBeNull();
  });

  it("overwrites existing value with set", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "old");
    cache.set("key1", "new");
    expect(cache.get("key1")).toBe("new");
  });

  it("resets TTL when overwriting a key", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("key1", "v1");

    vi.advanceTimersByTime(800);
    cache.set("key1", "v2"); // reset TTL

    vi.advanceTimersByTime(800); // 1600ms since first set, 800ms since second
    expect(cache.get("key1")).toBe("v2");

    vi.advanceTimersByTime(300); // 1100ms since second set
    expect(cache.get("key1")).toBeNull();
  });

  it("invalidating a non-existent key does not throw", () => {
    const cache = new TtlCache<string>();
    expect(() => cache.invalidate("nope")).not.toThrow();
  });
});
