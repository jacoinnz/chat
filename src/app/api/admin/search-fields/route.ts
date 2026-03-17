import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { searchFieldsPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/search-fields — update search fields array. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(searchFieldsPatchSchema, body);
    if (!v.success) return v.response;

    const { searchFields } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { searchFields },
    });

    logAudit(tenantId, userId, "update", "search-fields", `Updated search fields (${searchFields.length} fields)`);
    createConfigVersion(tenantId, request, "search-fields");

    return NextResponse.json({ searchFields: config.searchFields });
  } catch {
    return NextResponse.json(
      { error: "Failed to update search fields" },
      { status: 500 }
    );
  }
}
