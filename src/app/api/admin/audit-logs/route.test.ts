import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  checkAdmin: vi.fn(),
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin-auth";

const mockCheckAdmin = vi.mocked(checkAdmin);
const mockFindMany = vi.mocked(prisma.auditLog.findMany);
const mockCount = vi.mocked(prisma.auditLog.count);

function makeAdminInfo(overrides = {}) {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    userName: "Admin User",
    role: "platform_admin" as const,
    ...overrides,
  };
}

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => {
    mockCheckAdmin.mockResolvedValue(makeAdminInfo());
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("returns paginated results", async () => {
    const logs = [{ id: "1", action: "update", section: "taxonomy" }];
    mockFindMany.mockResolvedValue(logs as never);
    mockCount.mockResolvedValue(1);

    const request = new NextRequest("http://localhost/api/admin/audit-logs");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs).toEqual(logs);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
    expect(body.total).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  it("respects page and pageSize params", async () => {
    mockCount.mockResolvedValue(100);

    const request = new NextRequest("http://localhost/api/admin/audit-logs?page=3&pageSize=10");
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it("clamps pageSize to max 100", async () => {
    const request = new NextRequest("http://localhost/api/admin/audit-logs?pageSize=200");
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("filters by action", async () => {
    const request = new NextRequest("http://localhost/api/admin/audit-logs?action=update");
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "update" }),
      })
    );
  });

  it("filters by section", async () => {
    const request = new NextRequest("http://localhost/api/admin/audit-logs?section=taxonomy");
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ section: "taxonomy" }),
      })
    );
  });

  it("filters by date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/audit-logs?from=2025-01-01&to=2025-06-30"
    );
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it("returns auth error when checkAdmin fails", async () => {
    const { NextResponse } = await import("next/server");
    mockCheckAdmin.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const request = new NextRequest("http://localhost/api/admin/audit-logs");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("calculates totalPages correctly", async () => {
    mockCount.mockResolvedValue(51);

    const request = new NextRequest("http://localhost/api/admin/audit-logs?pageSize=25");
    const response = await GET(request);
    const body = await response.json();

    expect(body.totalPages).toBe(3); // Math.ceil(51/25)
  });
});
