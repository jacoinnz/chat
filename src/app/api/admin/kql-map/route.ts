import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { kqlPropertyMapPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/kql-map — update KQL property map. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(kqlPropertyMapPatchSchema, body);
    if (!v.success) return v.response;

    const { kqlPropertyMap } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { kqlPropertyMap },
    });

    const mappings = Object.entries(kqlPropertyMap).map(([k, v]) => `${k}=${v}`).join(", ");
    logAudit(tenantId, userId, "update", "kql-map", `Updated KQL mapping: ${mappings}`);
    createConfigVersion(tenantId, request, "kql-map");

    return NextResponse.json({ kqlPropertyMap: config.kqlPropertyMap });
  } catch {
    return NextResponse.json(
      { error: "Failed to update KQL property map" },
      { status: 500 }
    );
  }
}
