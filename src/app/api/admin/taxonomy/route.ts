import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole } from "@/lib/admin-auth";

/** PATCH /api/admin/taxonomy — update taxonomy arrays (department/sensitivity/status). */
export async function PATCH(request: Request) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await verifyAdminRole(authHeader.replace("Bearer ", ""));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

    return NextResponse.json({ taxonomy: config.taxonomy });
  } catch {
    return NextResponse.json(
      { error: "Failed to update taxonomy" },
      { status: 500 }
    );
  }
}
