import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/cron/weekly-cleanup — delete usage logs older than 90 days.
 *  Protected by CRON_SECRET Bearer token. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 90);

    const result = await prisma.usageLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoff.toISOString().split("T")[0],
    });
  } catch {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
