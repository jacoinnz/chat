import { mergeFilters, buildIntentKql } from "./graph-search";
import type { MetadataFilters } from "./taxonomy";
import type { IntentResult } from "./intent";

// ── mergeFilters ────────────────────────────────────────────────────

describe("mergeFilters", () => {
  it("returns detected filters when no manual filters", () => {
    const manual: MetadataFilters = {};
    const detected: Partial<MetadataFilters> = { department: "HR" };
    const result = mergeFilters(manual, detected);
    expect(result.department).toBe("HR");
  });

  it("manual filters take priority over detected", () => {
    const manual: MetadataFilters = { department: "Engineering" };
    const detected: Partial<MetadataFilters> = { department: "HR", contentType: "Policy" };
    const result = mergeFilters(manual, detected);
    expect(result.department).toBe("Engineering");
    expect(result.contentType).toBe("Policy");
  });

  it("skips undefined manual values (does not override detected)", () => {
    const manual: MetadataFilters = { department: undefined, contentType: "Report" };
    const detected: Partial<MetadataFilters> = { department: "HR" };
    const result = mergeFilters(manual, detected);
    expect(result.department).toBe("HR");
    expect(result.contentType).toBe("Report");
  });

  it("returns empty object when both are empty", () => {
    const result = mergeFilters({}, {});
    expect(Object.keys(result).length).toBe(0);
  });
});

// ── buildIntentKql ──────────────────────────────────────────────────

describe("buildIntentKql", () => {
  function makeIntent(overrides: Partial<IntentResult> = {}): IntentResult {
    return {
      intent: "keyword",
      refinedQuery: "test",
      detectedFilters: {},
      sortByRecency: false,
      ...overrides,
    };
  }

  it("adds Author KQL when intent has author", () => {
    const result = buildIntentKql(makeIntent({ author: "John Smith" }), {});
    expect(result).toContain('Author:"John Smith"');
  });

  it("adds FileType when intent has fileType and filter does not", () => {
    const result = buildIntentKql(makeIntent({ fileType: "xlsx" }), {});
    expect(result).toContain("FileType:xlsx");
  });

  it("skips FileType when filter already has fileType", () => {
    const result = buildIntentKql(
      makeIntent({ fileType: "xlsx" }),
      { fileType: "pdf" }
    );
    expect(result).not.toContain("FileType:");
  });

  it("adds date range when sortByRecency and no dateRange filter", () => {
    const result = buildIntentKql(makeIntent({ sortByRecency: true }), {});
    expect(result).toContain("LastModifiedTime>=");
  });

  it("skips date range when filter already has dateRange", () => {
    const result = buildIntentKql(
      makeIntent({ sortByRecency: true }),
      { dateRange: "last30" }
    );
    expect(result).not.toContain("LastModifiedTime");
  });

  it("joins multiple parts with AND", () => {
    const result = buildIntentKql(
      makeIntent({ author: "Alice", fileType: "docx" }),
      {}
    );
    expect(result).toContain(" AND ");
  });

  it("returns empty string when no intent enhancements", () => {
    const result = buildIntentKql(makeIntent(), {});
    expect(result).toBe("");
  });
});
