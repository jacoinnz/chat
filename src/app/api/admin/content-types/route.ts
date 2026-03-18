import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { configCache } from "@/lib/config-cache";
import { contentTypesPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/content-types — update content types list. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(contentTypesPatchSchema, body);
    if (!v.success) return v.response;

    const { contentTypes } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { contentTypes },
    });

    configCache.invalidate(tenantId);
    logAudit(tenantId, userId, "update", "content-types", `Updated content types (${contentTypes.length} items)`);
    createConfigVersion(tenantId, request, "content-types");

    return NextResponse.json({ contentTypes: config.contentTypes });
  } catch {
    return NextResponse.json(
      { error: "Failed to update content types" },
      { status: 500 }
    );
  }
}
