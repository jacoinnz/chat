import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractTenantInfo } from "@/lib/admin-auth";
import { validateBody, savedQueryCreateSchema, savedQueryDeleteSchema } from "@/lib/validations";

const MAX_SAVED_QUERIES = 50;

export async function GET(request: Request) {
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queries = await prisma.savedQuery.findMany({
    where: { tenantId: info.tenantId, userHash: info.userHash },
    orderBy: { createdAt: "desc" },
    take: MAX_SAVED_QUERIES,
  });

  return NextResponse.json(queries);
}

export async function POST(request: Request) {
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateBody(savedQueryCreateSchema, body);
  if (!validation.success) return validation.response;

  // Enforce max limit
  const count = await prisma.savedQuery.count({
    where: { tenantId: info.tenantId, userHash: info.userHash },
  });
  if (count >= MAX_SAVED_QUERIES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_SAVED_QUERIES} saved queries allowed` },
      { status: 400 }
    );
  }

  const query = await prisma.savedQuery.create({
    data: {
      tenantId: info.tenantId,
      userHash: info.userHash,
      title: validation.data.title,
      query: validation.data.query,
      filters: (validation.data.filters as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  return NextResponse.json(query, { status: 201 });
}

export async function DELETE(request: Request) {
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateBody(savedQueryDeleteSchema, body);
  if (!validation.success) return validation.response;

  await prisma.savedQuery.deleteMany({
    where: {
      id: validation.data.id,
      tenantId: info.tenantId,
      userHash: info.userHash,
    },
  });

  return NextResponse.json({ ok: true });
}
