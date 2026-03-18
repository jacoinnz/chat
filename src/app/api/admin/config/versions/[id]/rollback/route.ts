import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { configCache } from "@/lib/config-cache";

/** POST /api/admin/config/versions/[id]/rollback — rollback to a specific version. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;
  const { tenantId, userId } = auth;

  try {
    const { id } = await params;

    const target = await prisma.configVersion.findUnique({
      where: { id },
      select: { tenantId: true, version: true, snapshot: true },
    });

    if (!target || target.tenantId !== tenantId) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const snapshot = target.snapshot as Record<string, unknown>;

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

    configCache.invalidate(tenantId);
    logAudit(tenantId, userId, "update", "config", `Rolled back to version ${target.version}`);
    const result = await createConfigVersion(
      tenantId,
      request,
      "rollback",
      "published",
      `Rolled back to version ${target.version}`
    );

    return NextResponse.json({
      success: true,
      rolledBackTo: target.version,
      newVersion: result?.version ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to rollback" },
      { status: 500 }
    );
  }
}
