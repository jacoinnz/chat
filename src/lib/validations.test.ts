import {
  taxonomySchema,
  contentTypesSchema,
  keywordsSchema,
  reviewPoliciesSchema,
  searchBehaviourSchema,
  kqlPropertyMapSchema,
  searchFieldsSchema,
  roleAssignSchema,
  roleDeleteSchema,
  feedbackSchema,
  savedQueryCreateSchema,
  savedQueryDeleteSchema,
  favoriteCreateSchema,
  favoriteDeleteSchema,
  validateBody,
} from "./validations";

// ── taxonomySchema ──────────────────────────────────────────────────

describe("taxonomySchema", () => {
  it("accepts valid taxonomy", () => {
    const result = taxonomySchema.safeParse({
      department: ["Engineering"],
      sensitivity: ["Public"],
      status: ["Draft"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty arrays", () => {
    const result = taxonomySchema.safeParse({
      department: [],
      sensitivity: ["Public"],
      status: ["Draft"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = taxonomySchema.safeParse({ department: ["Engineering"] });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from strings", () => {
    const result = taxonomySchema.safeParse({
      department: ["  Engineering  "],
      sensitivity: ["Public"],
      status: ["Draft"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.department[0]).toBe("Engineering");
    }
  });
});

// ── contentTypesSchema ──────────────────────────────────────────────

describe("contentTypesSchema", () => {
  it("accepts valid content types array", () => {
    const result = contentTypesSchema.safeParse(["Document", "Form"]);
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = contentTypesSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("rejects strings exceeding max length", () => {
    const result = contentTypesSchema.safeParse(["x".repeat(101)]);
    expect(result.success).toBe(false);
  });
});

// ── keywordsSchema ──────────────────────────────────────────────────

describe("keywordsSchema", () => {
  it("accepts valid keywords", () => {
    const result = keywordsSchema.safeParse([
      { term: "HR", synonyms: ["Human Resources"] },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = keywordsSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("allows empty synonyms array", () => {
    const result = keywordsSchema.safeParse([{ term: "HR", synonyms: [] }]);
    expect(result.success).toBe(true);
  });

  it("rejects more than 20 synonyms", () => {
    const result = keywordsSchema.safeParse([
      { term: "HR", synonyms: Array.from({ length: 21 }, (_, i) => `syn${i}`) },
    ]);
    expect(result.success).toBe(false);
  });
});

// ── reviewPoliciesSchema ────────────────────────────────────────────

describe("reviewPoliciesSchema", () => {
  it("accepts valid policies", () => {
    const result = reviewPoliciesSchema.safeParse([
      { contentType: "Policy", maxAgeDays: 365, warningDays: 30 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects warningDays > maxAgeDays", () => {
    const result = reviewPoliciesSchema.safeParse([
      { contentType: "Policy", maxAgeDays: 30, warningDays: 60 },
    ]);
    expect(result.success).toBe(false);
  });

  it("allows warningDays === maxAgeDays", () => {
    const result = reviewPoliciesSchema.safeParse([
      { contentType: "Policy", maxAgeDays: 30, warningDays: 30 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = reviewPoliciesSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("rejects maxAgeDays out of range", () => {
    expect(
      reviewPoliciesSchema.safeParse([
        { contentType: "Policy", maxAgeDays: 0, warningDays: 0 },
      ]).success
    ).toBe(false);
    expect(
      reviewPoliciesSchema.safeParse([
        { contentType: "Policy", maxAgeDays: 3651, warningDays: 0 },
      ]).success
    ).toBe(false);
  });
});

// ── searchBehaviourSchema ───────────────────────────────────────────

describe("searchBehaviourSchema", () => {
  const valid = {
    approvedOnly: true,
    hideRestricted: false,
    maxResults: 15,
    recencyBoostDays: 30,
    recencyWeight: 1,
    matchWeight: 1,
    freshnessWeight: 1,
  };

  it("accepts valid search behaviour", () => {
    expect(searchBehaviourSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects total weight > 15", () => {
    const result = searchBehaviourSchema.safeParse({
      ...valid,
      recencyWeight: 5,
      matchWeight: 5,
      freshnessWeight: 5.1,
    });
    expect(result.success).toBe(false);
  });

  it("allows total weight exactly 15", () => {
    const result = searchBehaviourSchema.safeParse({
      ...valid,
      recencyWeight: 5,
      matchWeight: 5,
      freshnessWeight: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects maxResults below 5", () => {
    expect(searchBehaviourSchema.safeParse({ ...valid, maxResults: 4 }).success).toBe(false);
  });

  it("rejects maxResults above 50", () => {
    expect(searchBehaviourSchema.safeParse({ ...valid, maxResults: 51 }).success).toBe(false);
  });
});

// ── kqlPropertyMapSchema ────────────────────────────────────────────

describe("kqlPropertyMapSchema", () => {
  it("accepts valid property map", () => {
    const result = kqlPropertyMapSchema.safeParse({ department: "Department" });
    expect(result.success).toBe(true);
  });

  it("rejects empty map", () => {
    const result = kqlPropertyMapSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 entries", () => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 21; i++) map[`key${i}`] = `Prop${i}`;
    expect(kqlPropertyMapSchema.safeParse(map).success).toBe(false);
  });

  it("rejects invalid SharePoint property names", () => {
    expect(kqlPropertyMapSchema.safeParse({ key: "123invalid" }).success).toBe(false);
    expect(kqlPropertyMapSchema.safeParse({ key: "has spaces" }).success).toBe(false);
    expect(kqlPropertyMapSchema.safeParse({ key: "has:colon" }).success).toBe(false);
  });

  it("accepts valid SharePoint property names", () => {
    expect(kqlPropertyMapSchema.safeParse({ key: "ValidProp_1" }).success).toBe(true);
    expect(kqlPropertyMapSchema.safeParse({ key: "A" }).success).toBe(true);
  });
});

// ── searchFieldsSchema ──────────────────────────────────────────────

describe("searchFieldsSchema", () => {
  it("accepts valid search fields", () => {
    expect(searchFieldsSchema.safeParse(["ContentType", "Department"]).success).toBe(true);
  });

  it("rejects empty array", () => {
    expect(searchFieldsSchema.safeParse([]).success).toBe(false);
  });

  it("rejects invalid property names", () => {
    expect(searchFieldsSchema.safeParse(["123bad"]).success).toBe(false);
  });
});

// ── roleAssignSchema ────────────────────────────────────────────────

describe("roleAssignSchema", () => {
  const validHash = "a".repeat(64);

  it("accepts valid role assignment", () => {
    const result = roleAssignSchema.safeParse({
      userHash: validHash,
      role: "platform_admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects userHash not exactly 64 chars", () => {
    expect(roleAssignSchema.safeParse({ userHash: "a".repeat(63), role: "viewer" }).success).toBe(false);
    expect(roleAssignSchema.safeParse({ userHash: "a".repeat(65), role: "viewer" }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(roleAssignSchema.safeParse({ userHash: validHash, role: "superadmin" }).success).toBe(false);
  });

  it("accepts all valid roles", () => {
    for (const role of ["platform_admin", "config_admin", "auditor", "viewer"]) {
      expect(roleAssignSchema.safeParse({ userHash: validHash, role }).success).toBe(true);
    }
  });
});

// ── roleDeleteSchema ────────────────────────────────────────────────

describe("roleDeleteSchema", () => {
  it("accepts valid 64-char hash", () => {
    expect(roleDeleteSchema.safeParse({ userHash: "b".repeat(64) }).success).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(roleDeleteSchema.safeParse({ userHash: "short" }).success).toBe(false);
  });
});

// ── feedbackSchema ──────────────────────────────────────────────────

describe("feedbackSchema", () => {
  it("accepts valid feedback", () => {
    const result = feedbackSchema.safeParse({
      messageId: "msg-1",
      feedbackType: "thumbs_up",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional comment", () => {
    const result = feedbackSchema.safeParse({
      messageId: "msg-1",
      feedbackType: "report",
      comment: "This is wrong",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid feedbackType", () => {
    expect(
      feedbackSchema.safeParse({ messageId: "msg-1", feedbackType: "like" }).success
    ).toBe(false);
  });
});

// ── savedQueryCreateSchema ──────────────────────────────────────────

describe("savedQueryCreateSchema", () => {
  it("accepts valid saved query", () => {
    const result = savedQueryCreateSchema.safeParse({
      title: "My Query",
      query: "budget report",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(
      savedQueryCreateSchema.safeParse({ title: "", query: "test" }).success
    ).toBe(false);
  });

  it("accepts optional filters", () => {
    const result = savedQueryCreateSchema.safeParse({
      title: "My Query",
      query: "test",
      filters: { department: "HR" },
    });
    expect(result.success).toBe(true);
  });
});

// ── savedQueryDeleteSchema ──────────────────────────────────────────

describe("savedQueryDeleteSchema", () => {
  it("accepts valid id", () => {
    expect(savedQueryDeleteSchema.safeParse({ id: "abc-123" }).success).toBe(true);
  });

  it("rejects empty id", () => {
    expect(savedQueryDeleteSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

// ── favoriteCreateSchema ────────────────────────────────────────────

describe("favoriteCreateSchema", () => {
  it("accepts valid favorite", () => {
    const result = favoriteCreateSchema.safeParse({
      documentUrl: "https://example.com/doc",
      title: "My Doc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    expect(
      favoriteCreateSchema.safeParse({ documentUrl: "not-a-url", title: "Doc" }).success
    ).toBe(false);
  });
});

// ── favoriteDeleteSchema ────────────────────────────────────────────

describe("favoriteDeleteSchema", () => {
  it("accepts valid URL", () => {
    expect(
      favoriteDeleteSchema.safeParse({ documentUrl: "https://example.com/doc" }).success
    ).toBe(true);
  });

  it("rejects invalid URL", () => {
    expect(favoriteDeleteSchema.safeParse({ documentUrl: "bad" }).success).toBe(false);
  });
});

// ── validateBody ────────────────────────────────────────────────────

describe("validateBody", () => {
  it("returns success with parsed data for valid input", () => {
    const result = validateBody(savedQueryCreateSchema, {
      title: "Test",
      query: "hello",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Test");
      expect(result.data.query).toBe("hello");
    }
  });

  it("returns failure with 400 response for invalid input", () => {
    const result = validateBody(savedQueryCreateSchema, { title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  it("includes issues array in error response body", async () => {
    const result = validateBody(savedQueryCreateSchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error).toBe("Validation failed");
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues.length).toBeGreaterThan(0);
    }
  });
});
