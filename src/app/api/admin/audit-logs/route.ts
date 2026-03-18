import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
  const action = searchParams.get("action"); // "update" | "reset"
  const section = searchParams.get("section");
  const userHash = searchParams.get("userHash");
  const from = searchParams.get("from"); // ISO date string
  const to = searchParams.get("to"); // ISO date string

  const where: Record<string, unknown> = { tenantId: auth.tenantId };

  if (action) where.action = action;
  if (section) where.section = section;
  if (userHash) where.userHash = { contains: userHash };

  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      createdAt.lte = toDate;
    }
    where.createdAt = createdAt;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
