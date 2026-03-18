import {
  sanitizeForKql,
  sanitizeContent,
  getSensitivityLevel,
  requiresWarning,
  assessFreshness,
} from "./safety";
import { makeHit } from "@/test-utils/fixtures";

// ── sanitizeForKql ──────────────────────────────────────────────────

describe("sanitizeForKql", () => {
  it("strips backslashes", () => {
    expect(sanitizeForKql("test\\query")).toBe("testquery");
  });

  it("strips double quotes", () => {
    expect(sanitizeForKql('"hello"')).toBe("hello");
  });

  it("strips semicolons", () => {
    expect(sanitizeForKql("drop;table")).toBe("droptable");
  });

  it("strips brackets and parentheses", () => {
    expect(sanitizeForKql("func(arg)[0]{key}")).toBe("funcarg0key");
  });

  it("trims whitespace", () => {
    expect(sanitizeForKql("  hello world  ")).toBe("hello world");
  });

  it("enforces 200 character max length", () => {
    const long = "a".repeat(250);
    expect(sanitizeForKql(long)).toHaveLength(200);
  });

  it("handles empty string", () => {
    expect(sanitizeForKql("")).toBe("");
  });
});

// ── sanitizeContent ─────────────────────────────────────────────────

describe("sanitizeContent", () => {
  it("strips HTML tags", () => {
    expect(sanitizeContent("<b>bold</b>")).toBe("bold");
  });

  it("decodes HTML entities", () => {
    expect(sanitizeContent("&lt;script&gt;")).toBe("<script>");
  });

  it("strips javascript: protocol", () => {
    expect(sanitizeContent("javascript:alert(1)")).toBe("alert(1)");
  });

  it("strips event handlers", () => {
    expect(sanitizeContent("onerror=alert(1)")).toBe("alert(1)");
    expect(sanitizeContent("onclick =doStuff()")).toBe("doStuff()");
  });

  it("enforces 500 character max length", () => {
    const long = "a".repeat(600);
    expect(sanitizeContent(long)).toHaveLength(500);
  });

  it("trims whitespace", () => {
    expect(sanitizeContent("  hello  ")).toBe("hello");
  });
});

// ── getSensitivityLevel ─────────────────────────────────────────────

describe("getSensitivityLevel", () => {
  it("returns the sensitivity from hit fields", () => {
    const hit = makeHit({
      resource: { listItem: { fields: { Sensitivity: "Confidential" } } },
    });
    expect(getSensitivityLevel(hit)).toBe("Confidential");
  });

  it("returns 'Internal' as default", () => {
    const hit = makeHit({ resource: {} });
    expect(getSensitivityLevel(hit)).toBe("Internal");
  });

  it("returns 'Internal' for unknown sensitivity values", () => {
    const hit = makeHit({
      resource: { listItem: { fields: { Sensitivity: "TopSecret" } } },
    });
    expect(getSensitivityLevel(hit)).toBe("Internal");
  });

  it("handles all valid sensitivity levels", () => {
    for (const level of ["Public", "Internal", "Confidential", "Restricted"]) {
      const hit = makeHit({
        resource: { listItem: { fields: { Sensitivity: level } } },
      });
      expect(getSensitivityLevel(hit)).toBe(level);
    }
  });
});

// ── requiresWarning ─────────────────────────────────────────────────

describe("requiresWarning", () => {
  it("returns true for Confidential", () => {
    expect(requiresWarning("Confidential")).toBe(true);
  });

  it("returns true for Restricted", () => {
    expect(requiresWarning("Restricted")).toBe(true);
  });

  it("returns false for Public", () => {
    expect(requiresWarning("Public")).toBe(false);
  });

  it("returns false for Internal", () => {
    expect(requiresWarning("Internal")).toBe(false);
  });
});

// ── assessFreshness ─────────────────────────────────────────────────

describe("assessFreshness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks archived documents", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2025-06-01T00:00:00Z",
        listItem: { fields: { Status: "Archived" } },
      },
    });
    const result = assessFreshness(hit);
    expect(result.isArchived).toBe(true);
    expect(result.isStale).toBe(true);
    expect(result.warning).toContain("archived");
  });

  it("marks documents with overdue review date", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2025-06-01T00:00:00Z",
        listItem: { fields: { ReviewDate: "2025-01-01" } },
      },
    });
    const result = assessFreshness(hit);
    expect(result.isStale).toBe(true);
    expect(result.warning).toContain("Review overdue");
  });

  it("does not flag future review dates", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2025-06-01T00:00:00Z",
        listItem: { fields: { ReviewDate: "2025-12-31" } },
      },
    });
    const result = assessFreshness(hit);
    expect(result.isStale).toBe(false);
  });

  it("marks stale based on default 365-day max age", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2024-01-01T00:00:00Z", // ~530 days ago
      },
    });
    const result = assessFreshness(hit);
    expect(result.isStale).toBe(true);
    expect(result.warning).toContain("months ago");
  });

  it("uses policy-based staleness per content type", () => {
    // 170 days ago from 2025-06-15 → 2024-12-27
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2024-12-27T00:00:00Z", // ~170 days ago
        listItem: { fields: { ContentType: "Report" } },
      },
    });
    const policies = [
      { contentType: "Report", maxAgeDays: 180, warningDays: 14 },
    ];
    const result = assessFreshness(hit, policies);
    // 170 days > 166 (180-14) and 170 <= 180 → warning zone
    expect(result.isStale).toBe(false);
    expect(result.warning).toContain("Due for review");
  });

  it("falls back to Document policy when no exact match", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2023-01-01T00:00:00Z", // very old
        listItem: { fields: { ContentType: "Memo" } },
      },
    });
    const policies = [
      { contentType: "Document", maxAgeDays: 545, warningDays: 30 },
    ];
    const result = assessFreshness(hit, policies);
    expect(result.isStale).toBe(true);
  });

  it("shows warning zone when approaching staleness", () => {
    // Set up a document that's 340 days old with default 365-day policy + 30-day warning
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2024-07-10T00:00:00Z", // ~340 days ago
      },
    });
    const result = assessFreshness(hit);
    // 340 > 365-30=335, and 340 <= 365 → warning zone
    expect(result.isStale).toBe(false);
    expect(result.warning).toContain("Due for review");
  });

  it("returns fresh for recently modified documents", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2025-06-10T00:00:00Z", // 5 days ago
      },
    });
    const result = assessFreshness(hit);
    expect(result.isStale).toBe(false);
    expect(result.isArchived).toBe(false);
    expect(result.warning).toBeUndefined();
  });

  it("calculates daysSinceModified correctly", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2025-06-05T12:00:00Z", // exactly 10 days ago
      },
    });
    const result = assessFreshness(hit);
    expect(result.daysSinceModified).toBe(10);
  });

  it("archived check takes priority over review date", () => {
    const hit = makeHit({
      resource: {
        lastModifiedDateTime: "2025-06-01T00:00:00Z",
        listItem: { fields: { Status: "Archived", ReviewDate: "2025-01-01" } },
      },
    });
    const result = assessFreshness(hit);
    expect(result.isArchived).toBe(true);
    expect(result.warning).toContain("archived");
  });
});
