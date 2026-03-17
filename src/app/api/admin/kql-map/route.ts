import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";

/** PATCH /api/admin/kql-map — update KQL property map. */
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
    const { kqlPropertyMap } = body;

    if (!kqlPropertyMap || typeof kqlPropertyMap !== "object" || Array.isArray(kqlPropertyMap)) {
      return NextResponse.json(
        { error: "kqlPropertyMap must be an object" },
        { status: 400 }
      );
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { kqlPropertyMap },
    });

    const userId = request.headers.get("x-user-id") || "";
    const mappings = Object.entries(kqlPropertyMap).map(([k, v]) => `${k}=${v}`).join(", ");
    logAudit(tenantId, userId, "update", "kql-map", `Updated KQL mapping: ${mappings}`);

    return NextResponse.json({ kqlPropertyMap: config.kqlPropertyMap });
  } catch {
    return NextResponse.json(
      { error: "Failed to update KQL property map" },
      { status: 500 }
    );
  }
}
