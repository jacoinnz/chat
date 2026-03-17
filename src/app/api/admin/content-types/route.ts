import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";

/** PATCH /api/admin/content-types — update content types list. */
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
    const { contentTypes } = body;

    if (!Array.isArray(contentTypes)) {
      return NextResponse.json(
        { error: "contentTypes must be an array" },
        { status: 400 }
      );
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { contentTypes },
    });

    const userId = request.headers.get("x-user-id") || "";
    logAudit(tenantId, userId, "update", "content-types", `Updated content types (${contentTypes.length} items)`);

    return NextResponse.json({ contentTypes: config.contentTypes });
  } catch {
    return NextResponse.json(
      { error: "Failed to update content types" },
      { status: 500 }
    );
  }
}
