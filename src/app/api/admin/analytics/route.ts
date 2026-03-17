import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole } from "@/lib/admin-auth";
import { DEFAULT_KQL_PROPERTY_MAP } from "@/lib/taxonomy-defaults";

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** GET /api/admin/analytics?period=7d|30d|90d — tenant overview + health + alerts. */
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

    // Today boundary (start of UTC day)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Last 24 hours boundary (for alerts)
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    // 7-day and 30-day boundaries for the usage summary
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Core counts + usage summary + last-24h error monitoring
    const [
      searchCount, chatCount, errorCount, noResultCount,
      graphErrorCount, authErrorCount, activeUsers,
      // Usage summary: searches by time window
      searchesToday, searches7d, searches30d,
      // AI answers generated
      aiAnswersToday, aiAnswers7d, aiAnswers30d,
      // Active users by window
      activeUsersToday, activeUsers7d, activeUsers30d,
      // Last 24h error monitoring
      errors24h, graphErrors24h, authErrors24h, aiErrors24h,
      totalEvents24h,
      // Tenant config (for KQL mapping check)
      tenantConfig,
      // Recent audit log entries
      recentAuditLogs,
    ] = await Promise.all([
      prisma.usageLog.count({
        where: { tenantId, event: "search", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "chat", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "error", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "no_results", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "graph_error", createdAt: { gte: since } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "auth_error", createdAt: { gte: since } },
      }),
      prisma.usageLog
        .findMany({
          where: { tenantId, createdAt: { gte: since } },
          distinct: ["userHash"],
          select: { userHash: true },
        })
        .then((rows: { userHash: string }[]) => rows.length),
      // Searches: today / 7d / 30d
      prisma.usageLog.count({
        where: { tenantId, event: "search", createdAt: { gte: todayStart } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "search", createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "search", createdAt: { gte: thirtyDaysAgo } },
      }),
      // AI answers: today / 7d / 30d
      prisma.usageLog.count({
        where: { tenantId, event: "chat", createdAt: { gte: todayStart } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "chat", createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "chat", createdAt: { gte: thirtyDaysAgo } },
      }),
      // Active users: today / 7d / 30d
      prisma.usageLog
        .findMany({
          where: { tenantId, createdAt: { gte: todayStart } },
          distinct: ["userHash"],
          select: { userHash: true },
        })
        .then((rows: { userHash: string }[]) => rows.length),
      prisma.usageLog
        .findMany({
          where: { tenantId, createdAt: { gte: sevenDaysAgo } },
          distinct: ["userHash"],
          select: { userHash: true },
        })
        .then((rows: { userHash: string }[]) => rows.length),
      prisma.usageLog
        .findMany({
          where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
          distinct: ["userHash"],
          select: { userHash: true },
        })
        .then((rows: { userHash: string }[]) => rows.length),
      // Last 24h error monitoring
      prisma.usageLog.count({
        where: { tenantId, event: "error", createdAt: { gte: last24h } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "graph_error", createdAt: { gte: last24h } },
      }),
      prisma.usageLog.count({
        where: { tenantId, event: "auth_error", createdAt: { gte: last24h } },
      }),
      // AI failures (errors during chat phase)
      prisma.usageLog.count({
        where: {
          tenantId,
          event: "error",
          createdAt: { gte: last24h },
          errorCode: { contains: "AI" },
        },
      }),
      // Total events in last 24h (for error rate)
      prisma.usageLog.count({
        where: { tenantId, createdAt: { gte: last24h } },
      }),
      // Tenant config (for KQL mapping health check)
      prisma.tenantConfig.findUnique({
        where: { tenantId },
        select: { kqlPropertyMap: true },
      }),
      // Recent audit log entries (last 20)
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const totalEvents = searchCount + chatCount + errorCount;
    const errorRate = totalEvents > 0 ? ((errorCount / totalEvents) * 100).toFixed(1) : "0.0";

    // Average results per query — from search logs with resultCount
    const searchLogsWithResults = await prisma.usageLog.findMany({
      where: {
        tenantId,
        event: "search",
        createdAt: { gte: since },
        resultCount: { not: null },
      },
      select: { resultCount: true },
    });
    const totalResults = searchLogsWithResults.reduce(
      (sum, log) => sum + (log.resultCount ?? 0), 0
    );
    const avgResultsPerQuery = searchLogsWithResults.length > 0
      ? (totalResults / searchLogsWithResults.length).toFixed(1)
      : "0.0";

    // Daily breakdown + hourly breakdown for peak hours
    const allLogs = await prisma.usageLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { event: true, createdAt: true, filtersUsed: true, intentType: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, { search: number; chat: number; error: number; noResults: number }>();
    const filterCounts = new Map<string, number>();
    const intentCounts = new Map<string, number>();
    const hourlyMap = new Map<number, number>(); // hour (0-23) → event count

    for (const log of allLogs) {
      const dateKey = log.createdAt.toISOString().split("T")[0];
      const entry = dailyMap.get(dateKey) || { search: 0, chat: 0, error: 0, noResults: 0 };

      if (log.event === "search") entry.search++;
      else if (log.event === "chat") entry.chat++;
      else if (log.event === "error" || log.event === "graph_error" || log.event === "auth_error") entry.error++;
      else if (log.event === "no_results") entry.noResults++;
      dailyMap.set(dateKey, entry);

      // Peak hours tracking
      const hour = log.createdAt.getUTCHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);

      if (log.filtersUsed) {
        try {
          const keys = JSON.parse(log.filtersUsed) as string[];
          for (const key of keys) {
            filterCounts.set(key, (filterCounts.get(key) || 0) + 1);
          }
        } catch {
          // Malformed filter data — skip
        }
      }

      if (log.intentType) {
        intentCounts.set(log.intentType, (intentCounts.get(log.intentType) || 0) + 1);
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Peak hours — sorted by activity
    const peakHours = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topFilters = Array.from(filterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([filter, count]) => ({ filter, count }));

    // Top intents with percentages
    const totalIntentEvents = Array.from(intentCounts.values()).reduce((s, c) => s + c, 0);
    const topIntents = Array.from(intentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: totalIntentEvents > 0 ? ((count / totalIntentEvents) * 100).toFixed(0) : "0",
      }));

    // KQL mapping health check — are properties still using defaults?
    const kqlMap = (tenantConfig?.kqlPropertyMap ?? DEFAULT_KQL_PROPERTY_MAP) as Record<string, string>;
    const isDefaultKql = JSON.stringify(kqlMap) === JSON.stringify(DEFAULT_KQL_PROPERTY_MAP);
    // Check if any mapped properties use generic names (likely not configured for the tenant's SharePoint)
    const hasGenericMappings = Object.values(kqlMap).some(
      (v) => typeof v === "string" && v === "Department" || v === "Sensitivity" || v === "Status"
    );

    // Tenant health indicators
    const noResultRate = searchCount > 0
      ? ((noResultCount / searchCount) * 100).toFixed(1)
      : "0.0";

    const hasZeroResultSpike = searchCount > 10 && (noResultCount / searchCount) > 0.3;
    const hasMissingPropertyMapping = isDefaultKql && hasGenericMappings;

    const health = {
      graphErrors: graphErrorCount,
      authErrors: authErrorCount,
      noResultRate,
      hasZeroResultSpike,
      hasMissingPropertyMapping,
      status: graphErrorCount > 5 || authErrorCount > 5
        ? "degraded"
        : hasZeroResultSpike || hasMissingPropertyMapping
          ? "warning"
          : "healthy",
    };

    // Alerts — actionable issues requiring attention
    const errorRate24h = totalEvents24h > 0 ? (errors24h + graphErrors24h + authErrors24h) / totalEvents24h : 0;
    const alerts: Array<{ severity: "critical" | "warning" | "info"; message: string }> = [];

    if (errorRate24h > 0.1 && totalEvents24h > 5) {
      alerts.push({
        severity: "critical",
        message: `High error rate in last 24 hours: ${(errorRate24h * 100).toFixed(1)}% (${errors24h + graphErrors24h + authErrors24h} errors out of ${totalEvents24h} events)`,
      });
    }
    if (graphErrors24h > 3) {
      alerts.push({
        severity: "critical",
        message: `${graphErrors24h} Graph API failures in last 24 hours — check SharePoint permissions`,
      });
    }
    if (authErrors24h > 3) {
      alerts.push({
        severity: "warning",
        message: `${authErrors24h} authentication errors in last 24 hours — users may have expired tokens`,
      });
    }
    if (hasZeroResultSpike) {
      alerts.push({
        severity: "warning",
        message: `No-result spike detected: ${noResultRate}% of searches returned zero results`,
      });
    }
    if (hasMissingPropertyMapping) {
      alerts.push({
        severity: "warning",
        message: "KQL property mappings are using defaults — configure managed properties for your SharePoint environment",
      });
    }
    if (aiErrors24h > 2) {
      alerts.push({
        severity: "warning",
        message: `${aiErrors24h} AI service failures in last 24 hours`,
      });
    }

    // Error monitoring breakdown
    const errorMonitoring = {
      graphApiFailures: { period: graphErrorCount, last24h: graphErrors24h },
      authErrors: { period: authErrorCount, last24h: authErrors24h },
      aiFailures: { period: errorCount, last24h: errors24h },
      totalErrors24h: errors24h + graphErrors24h + authErrors24h,
      errorRate24h: totalEvents24h > 0 ? ((errors24h + graphErrors24h + authErrors24h) / totalEvents24h * 100).toFixed(1) : "0.0",
    };

    return NextResponse.json({
      period,
      searchCount,
      chatCount,
      errorCount,
      errorRate,
      activeUsers,
      noResultCount,
      avgResultsPerQuery,
      usageSummary: {
        searches: { today: searchesToday, "7d": searches7d, "30d": searches30d },
        aiAnswers: { today: aiAnswersToday, "7d": aiAnswers7d, "30d": aiAnswers30d },
        activeUsers: { today: activeUsersToday, "7d": activeUsers7d, "30d": activeUsers30d },
      },
      daily,
      peakHours,
      topFilters,
      topIntents,
      health,
      alerts,
      errorMonitoring,
      recentChanges: recentAuditLogs.map((log) => ({
        action: log.action,
        section: log.section,
        details: log.details,
        userHash: log.userHash.slice(0, 8) + "...",
        createdAt: log.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
