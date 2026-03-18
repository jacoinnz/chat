vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedQuery: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  extractTenantInfo: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: vi.fn(() => null),
}));

import { GET, POST, DELETE } from "./route";
import { prisma } from "@/lib/prisma";
import { extractTenantInfo } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

const mockExtractTenantInfo = vi.mocked(extractTenantInfo);
const mockApplyRateLimit = vi.mocked(applyRateLimit);
const mockFindMany = vi.mocked(prisma.savedQuery.findMany);
const mockCount = vi.mocked(prisma.savedQuery.count);
const mockCreate = vi.mocked(prisma.savedQuery.create);
const mockDeleteMany = vi.mocked(prisma.savedQuery.deleteMany);

function tenantInfo() {
  return { tenantId: "t1", userId: "u1", userHash: "h".repeat(64) };
}

describe("GET /api/saved-queries", () => {
  beforeEach(() => {
    mockApplyRateLimit.mockReturnValue(null);
    mockExtractTenantInfo.mockResolvedValue(tenantInfo());
    mockFindMany.mockResolvedValue([]);
  });

  it("returns saved queries sorted by createdAt desc", async () => {
    const queries = [{ id: "q1", title: "Budget", query: "budget report" }];
    mockFindMany.mockResolvedValue(queries as never);

    const request = new Request("http://localhost/api/saved-queries");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(queries);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    );
  });

  it("returns 401 when auth fails", async () => {
    mockExtractTenantInfo.mockResolvedValue(null);

    const request = new Request("http://localhost/api/saved-queries");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockApplyRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const request = new Request("http://localhost/api/saved-queries");
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});

describe("POST /api/saved-queries", () => {
  beforeEach(() => {
    mockApplyRateLimit.mockReturnValue(null);
    mockExtractTenantInfo.mockResolvedValue(tenantInfo());
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue({ id: "new-1", title: "Test", query: "test" } as never);
  });

  it("creates a new saved query", async () => {
    const request = new Request("http://localhost/api/saved-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Query", query: "budget" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    const request = new Request("http://localhost/api/saved-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }), // empty title
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when max queries reached", async () => {
    mockCount.mockResolvedValue(50);

    const request = new Request("http://localhost/api/saved-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Another", query: "test" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("50");
  });

  it("returns 401 when auth fails", async () => {
    mockExtractTenantInfo.mockResolvedValue(null);

    const request = new Request("http://localhost/api/saved-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", query: "test" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockApplyRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const request = new Request("http://localhost/api/saved-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", query: "test" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(429);
  });
});

describe("DELETE /api/saved-queries", () => {
  beforeEach(() => {
    mockExtractTenantInfo.mockResolvedValue(tenantInfo());
    mockDeleteMany.mockResolvedValue({ count: 1 } as never);
  });

  it("deletes a saved query by id, tenantId, and userHash", async () => {
    const request = new Request("http://localhost/api/saved-queries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "q1" }),
    });
    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "q1",
          tenantId: "t1",
          userHash: "h".repeat(64),
        }),
      })
    );
  });

  it("returns 400 for invalid body", async () => {
    const request = new Request("http://localhost/api/saved-queries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "" }), // empty id
    });
    const response = await DELETE(request);

    expect(response.status).toBe(400);
  });

  it("returns 401 when auth fails", async () => {
    mockExtractTenantInfo.mockResolvedValue(null);

    const request = new Request("http://localhost/api/saved-queries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "q1" }),
    });
    const response = await DELETE(request);

    expect(response.status).toBe(401);
  });
});
