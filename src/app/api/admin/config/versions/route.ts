import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin-auth";

const PAGE_SIZE = 20;

/** GET /api/admin/config/versions — paginated version history. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const [versions, total] = await Promise.all([
      prisma.configVersion.findMany({
        where: { tenantId },
        orderBy: { version: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          version: true,
          status: true,
          section: true,
          authorName: true,
          comment: true,
          createdAt: true,
          publishedAt: true,
        },
      }),
      prisma.configVersion.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({
      versions,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch version history" },
      { status: 500 }
    );
  }
}
