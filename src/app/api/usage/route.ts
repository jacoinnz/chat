import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTenantInfo } from "@/lib/admin-auth";

// Simple in-memory rate limiter: 100 events per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userHash);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userHash, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 100) return false;
  entry.count++;
  return true;
}

const VALID_EVENTS = new Set([
  "search",
  "chat",
  "error",
  "no_results",
  "graph_error",
  "auth_error",
]);

/** POST /api/usage — log an anonymised usage event. */
export async function POST(request: Request) {
  const tenantInfo = await extractTenantInfo(request);
  if (!tenantInfo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(tenantInfo.userHash)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const event = body.event;
    if (!event || !VALID_EVENTS.has(event)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Ensure tenant exists (upsert to avoid FK constraint failures)
    await prisma.tenant.upsert({
      where: { tenantId: tenantInfo.tenantId },
      create: { tenantId: tenantInfo.tenantId },
      update: {},
    });

    // Extract only filter keys used (not values — no PII)
    let filtersUsed: string | null = null;
    if (body.filtersUsed && typeof body.filtersUsed === "object") {
      const keys = Object.keys(body.filtersUsed).filter(
        (k) => body.filtersUsed[k] !== undefined && body.filtersUsed[k] !== null
      );
      filtersUsed = keys.length > 0 ? JSON.stringify(keys) : null;
    }

    await prisma.usageLog.create({
      data: {
        tenantId: tenantInfo.tenantId,
        event,
        userHash: tenantInfo.userHash,
        errorCode: body.errorCode || null,
        resultCount: typeof body.resultCount === "number" ? body.resultCount : null,
        query: null, // Never store raw queries — privacy by design
        filtersUsed,
        intentType: typeof body.intentType === "string" ? body.intentType : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to log usage" },
      { status: 500 }
    );
  }
}
