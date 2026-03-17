import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";

/** POST /api/admin/config/publish — publish a draft (copies snapshot to TenantConfig). */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
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
        taxonomy: snapshot.taxonomy as any,
        contentTypes: snapshot.contentTypes as any,
        kqlPropertyMap: snapshot.kqlPropertyMap as any,
        searchFields: snapshot.searchFields as any,
        keywords: snapshot.keywords as any,
        reviewPolicies: snapshot.reviewPolicies as any,
        searchBehaviour: snapshot.searchBehaviour as any,
      },
    });

    // Mark the draft as published
    await prisma.configVersion.update({
      where: { id: draft.id },
      data: { status: "published", publishedAt: new Date() },
    });

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
