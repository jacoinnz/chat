import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit } from "@/lib/admin-auth";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { featureFlagToggleSchema, validateBody } from "@/lib/validations";

/** GET /api/admin/feature-flags — list all flags for tenant. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const flags = await getAllFeatureFlags(auth.tenantId);
  return NextResponse.json({ flags });
}

/** PATCH /api/admin/feature-flags — toggle a feature flag. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const v = validateBody(featureFlagToggleSchema, body);
    if (!v.success) return v.response;

    const { name, enabled, description } = v.data;

    await prisma.featureFlag.upsert({
      where: { tenantId_name: { tenantId: auth.tenantId, name } },
      create: {
        tenantId: auth.tenantId,
        name,
        enabled,
        description: description ?? "",
      },
      update: {
        enabled,
        ...(description !== undefined ? { description } : {}),
      },
    });

    logAudit(auth.tenantId, auth.userId, "update", "feature-flags", `${enabled ? "Enabled" : "Disabled"} flag: ${name}`);

    const flags = await getAllFeatureFlags(auth.tenantId);
    return NextResponse.json({ flags });
  } catch {
    return NextResponse.json({ error: "Failed to update feature flag" }, { status: 500 });
  }
}
