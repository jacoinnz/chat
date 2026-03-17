import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";

/** PATCH /api/admin/search-fields — update search fields array. */
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
    const { searchFields } = body;

    if (!Array.isArray(searchFields)) {
      return NextResponse.json(
        { error: "searchFields must be an array" },
        { status: 400 }
      );
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { searchFields },
    });

    const userId = request.headers.get("x-user-id") || "";
    logAudit(tenantId, userId, "update", "search-fields", `Updated search fields (${searchFields.length} fields)`);

    return NextResponse.json({ searchFields: config.searchFields });
  } catch {
    return NextResponse.json(
      { error: "Failed to update search fields" },
      { status: 500 }
    );
  }
}
