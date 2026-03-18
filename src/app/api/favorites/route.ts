import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractTenantInfo } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, favoriteCreateSchema, favoriteDeleteSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const rateLimited = applyRateLimit(request, "userData");
  if (rateLimited) return rateLimited;
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { tenantId: info.tenantId, userHash: info.userHash },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favorites);
}

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, "userData");
  if (rateLimited) return rateLimited;

  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateBody(favoriteCreateSchema, body);
  if (!validation.success) return validation.response;

  // Upsert on unique constraint (tenantId + userHash + documentUrl)
  const favorite = await prisma.favorite.upsert({
    where: {
      tenantId_userHash_documentUrl: {
        tenantId: info.tenantId,
        userHash: info.userHash,
        documentUrl: validation.data.documentUrl,
      },
    },
    update: {
      title: validation.data.title,
      siteName: validation.data.siteName ?? "",
      metadata: (validation.data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
    create: {
      tenantId: info.tenantId,
      userHash: info.userHash,
      documentUrl: validation.data.documentUrl,
      title: validation.data.title,
      siteName: validation.data.siteName ?? "",
      metadata: (validation.data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  return NextResponse.json(favorite, { status: 201 });
}

export async function DELETE(request: Request) {
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateBody(favoriteDeleteSchema, body);
  if (!validation.success) return validation.response;

  await prisma.favorite.deleteMany({
    where: {
      tenantId: info.tenantId,
      userHash: info.userHash,
      documentUrl: validation.data.documentUrl,
    },
  });

  return NextResponse.json({ ok: true });
}
