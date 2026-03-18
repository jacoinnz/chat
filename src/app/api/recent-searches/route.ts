import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractTenantInfo } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

const MAX_RECENT = 50;
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const rateLimited = applyRateLimit(request, "userData");
  if (rateLimited) return rateLimited;
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searches = await prisma.recentSearch.findMany({
    where: { tenantId: info.tenantId, userHash: info.userHash },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(searches);
}

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, "userData");
  if (rateLimited) return rateLimited;

  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const resultCount = typeof body.resultCount === "number" ? body.resultCount : 0;
  const filters = body.filters ?? Prisma.JsonNull;

  // Dedup: skip if same query within the last hour
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  const recent = await prisma.recentSearch.findFirst({
    where: {
      tenantId: info.tenantId,
      userHash: info.userHash,
      query,
      createdAt: { gte: cutoff },
    },
  });

  if (recent) {
    // Update result count on existing entry
    await prisma.recentSearch.update({
      where: { id: recent.id },
      data: { resultCount, filters },
    });
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  await prisma.recentSearch.create({
    data: {
      tenantId: info.tenantId,
      userHash: info.userHash,
      query,
      filters,
      resultCount,
    },
  });

  // Prune old entries beyond MAX_RECENT
  const all = await prisma.recentSearch.findMany({
    where: { tenantId: info.tenantId, userHash: info.userHash },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (all.length > MAX_RECENT) {
    const toDelete = all.slice(MAX_RECENT).map((r) => r.id);
    await prisma.recentSearch.deleteMany({ where: { id: { in: toDelete } } });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
