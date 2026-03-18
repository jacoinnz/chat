import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/cron/daily-aggregate — aggregate yesterday's usage logs per tenant.
 *  Protected by CRON_SECRET Bearer token. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Yesterday's date boundaries (UTC)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    // Get all tenants that have logs from yesterday
    const tenantLogs = await prisma.usageLog.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      distinct: ["tenantId"],
      select: { tenantId: true },
    });

    const results = await Promise.all(
      tenantLogs.map(async ({ tenantId }) => {
        const [searchCount, chatCount, errorCount, noResultCount, activeUsersResult] =
          await Promise.all([
            prisma.usageLog.count({
              where: { tenantId, event: "search", createdAt: { gte: dayStart, lte: dayEnd } },
            }),
            prisma.usageLog.count({
              where: { tenantId, event: "chat", createdAt: { gte: dayStart, lte: dayEnd } },
            }),
            prisma.usageLog.count({
              where: {
                tenantId,
                event: { in: ["error", "graph_error", "auth_error"] },
                createdAt: { gte: dayStart, lte: dayEnd },
              },
            }),
            prisma.usageLog.count({
              where: { tenantId, event: "no_results", createdAt: { gte: dayStart, lte: dayEnd } },
            }),
            prisma.usageLog.findMany({
              where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
              distinct: ["userHash"],
              select: { userHash: true },
            }),
          ]);

        await prisma.usageDailySummary.upsert({
          where: { tenantId_date: { tenantId, date: dateStr } },
          create: {
            tenantId,
            date: dateStr,
            searchCount,
            chatCount,
            errorCount,
            noResultCount,
            activeUsers: activeUsersResult.length,
          },
          update: {
            searchCount,
            chatCount,
            errorCount,
            noResultCount,
            activeUsers: activeUsersResult.length,
          },
        });

        return { tenantId, searchCount, chatCount, errorCount };
      })
    );

    return NextResponse.json({
      success: true,
      date: dateStr,
      tenantsProcessed: results.length,
      results,
    });
  } catch {
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
  }
}
