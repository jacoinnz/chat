import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole } from "@/lib/admin-auth";

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** GET /api/admin/analytics?period=7d|30d|90d — aggregated usage stats. */
export async function GET(request: Request) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await verifyAdminRole(authHeader.replace("Bearer ", ""));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const days = PERIOD_DAYS[period] || 7;

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Aggregate counts by event type
    const [searchCount, chatCount, errorCount, activeUsers] = await Promise.all([
      prisma.usageLog.count({
        where: { tenantId, event: "search", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "chat", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "error", createdAt: { gte: since } },
      }),
      prisma.usageLog
        .findMany({
          where: { tenantId, createdAt: { gte: since } },
          distinct: ["userHash"],
          select: { userHash: true },
        })
        .then((rows: { userHash: string }[]) => rows.length),
    ]);

    const totalEvents = searchCount + chatCount + errorCount;
    const errorRate = totalEvents > 0 ? ((errorCount / totalEvents) * 100).toFixed(1) : "0.0";

    // Daily breakdown
    const allLogs = await prisma.usageLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { event: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, { search: number; chat: number; error: number }>();

    for (const log of allLogs) {
      const dateKey = log.createdAt.toISOString().split("T")[0];
      const entry = dailyMap.get(dateKey) || { search: 0, chat: 0, error: 0 };
      if (log.event === "search") entry.search++;
      else if (log.event === "chat") entry.chat++;
      else if (log.event === "error") entry.error++;
      dailyMap.set(dateKey, entry);
    }

    const daily = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return NextResponse.json({
      period,
      searchCount,
      chatCount,
      errorCount,
      errorRate,
      activeUsers,
      daily,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
