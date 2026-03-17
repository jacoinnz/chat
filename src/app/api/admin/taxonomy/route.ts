import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";

/** PATCH /api/admin/taxonomy — update taxonomy arrays (department/sensitivity/status). */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const { taxonomy } = body;

    if (!taxonomy || typeof taxonomy !== "object") {
      return NextResponse.json(
        { error: "Invalid taxonomy data" },
        { status: 400 }
      );
    }

    // Validate taxonomy structure
    if (
      !Array.isArray(taxonomy.department) ||
      !Array.isArray(taxonomy.sensitivity) ||
      !Array.isArray(taxonomy.status)
    ) {
      return NextResponse.json(
        { error: "Taxonomy must contain department, sensitivity, and status arrays" },
        { status: 400 }
      );
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { taxonomy },
    });

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
