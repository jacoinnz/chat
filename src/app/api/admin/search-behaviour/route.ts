import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { searchBehaviourPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/search-behaviour — update search behaviour settings. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(searchBehaviourPatchSchema, body);
    if (!v.success) return v.response;

    const { searchBehaviour } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { searchBehaviour },
    });

    const changedKeys = Object.keys(searchBehaviour).join(", ");
    logAudit(tenantId, userId, "update", "search-behaviour", `Updated search behaviour: ${changedKeys}`);
    createConfigVersion(tenantId, request, "search-behaviour");

    return NextResponse.json({ searchBehaviour: config.searchBehaviour });
  } catch {
    return NextResponse.json({ error: "Failed to update search behaviour" }, { status: 500 });
  }
}
