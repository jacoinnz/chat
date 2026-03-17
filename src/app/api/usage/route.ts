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
    if (!event || !["search", "chat", "error"].includes(event)) {
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

    await prisma.usageLog.create({
      data: {
        tenantId: tenantInfo.tenantId,
        event,
        userHash: tenantInfo.userHash,
        errorCode: body.errorCode || null,
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
