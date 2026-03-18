import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { configCache } from "@/lib/config-cache";
import { taxonomyPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/taxonomy — update taxonomy arrays (department/sensitivity/status). */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(taxonomyPatchSchema, body);
    if (!v.success) return v.response;

    const { taxonomy } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { taxonomy },
    });

    configCache.invalidate(tenantId);
    logAudit(tenantId, userId, "update", "taxonomy", `Updated departments (${taxonomy.department.length}), sensitivities (${taxonomy.sensitivity.length}), statuses (${taxonomy.status.length})`);
    createConfigVersion(tenantId, request, "taxonomy");

    return NextResponse.json({ taxonomy: config.taxonomy });
  } catch {
    return NextResponse.json(
      { error: "Failed to update taxonomy" },
      { status: 500 }
    );
  }
}
