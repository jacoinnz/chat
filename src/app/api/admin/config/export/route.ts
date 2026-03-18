import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole } from "@/lib/admin-auth";

/** GET /api/admin/config/export — download full tenant config as JSON. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "auditor");
  if (roleCheck) return roleCheck;

  try {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId: auth.tenantId },
    });

    if (!config) {
      return NextResponse.json({ error: "No configuration found" }, { status: 404 });
    }

    const exportData = {
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      keywords: config.keywords,
      reviewPolicies: config.reviewPolicies,
      searchBehaviour: config.searchBehaviour,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tenant-config-${auth.tenantId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export config" }, { status: 500 });
  }
}
