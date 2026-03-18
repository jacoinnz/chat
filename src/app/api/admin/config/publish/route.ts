import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, logAudit } from "@/lib/admin-auth";
import { configCache } from "@/lib/config-cache";

/** POST /api/admin/config/publish — publish a draft (copies snapshot to TenantConfig). */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;
  const { tenantId, userId } = auth;

  try {
    // Find the current draft
    const draft = await prisma.configVersion.findFirst({
      where: { tenantId, status: "draft" },
      orderBy: { version: "desc" },
    });

    if (!draft) {
      return NextResponse.json({ error: "No draft to publish" }, { status: 404 });
    }

    const snapshot = draft.snapshot as Record<string, unknown>;

    // Write snapshot to TenantConfig
    await prisma.tenantConfig.update({
      where: { tenantId },
      data: {
        taxonomy: snapshot.taxonomy as Prisma.InputJsonValue,
        contentTypes: snapshot.contentTypes as Prisma.InputJsonValue,
        kqlPropertyMap: snapshot.kqlPropertyMap as Prisma.InputJsonValue,
        searchFields: snapshot.searchFields as Prisma.InputJsonValue,
        keywords: snapshot.keywords as Prisma.InputJsonValue,
        reviewPolicies: snapshot.reviewPolicies as Prisma.InputJsonValue,
        searchBehaviour: snapshot.searchBehaviour as Prisma.InputJsonValue,
      },
    });

    // Mark the draft as published
    await prisma.configVersion.update({
      where: { id: draft.id },
      data: { status: "published", publishedAt: new Date() },
    });

    configCache.invalidate(tenantId);
    logAudit(tenantId, userId, "update", "config", `Published draft version ${draft.version}`);

    return NextResponse.json({
      success: true,
      publishedVersion: draft.version,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to publish draft" },
      { status: 500 }
    );
  }
}
