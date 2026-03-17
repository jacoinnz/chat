import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";

/** POST /api/admin/config/versions/[id]/rollback — rollback to a specific version. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
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
        taxonomy: snapshot.taxonomy as any,
        contentTypes: snapshot.contentTypes as any,
        kqlPropertyMap: snapshot.kqlPropertyMap as any,
        searchFields: snapshot.searchFields as any,
        keywords: snapshot.keywords as any,
        reviewPolicies: snapshot.reviewPolicies as any,
        searchBehaviour: snapshot.searchBehaviour as any,
      },
    });

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
