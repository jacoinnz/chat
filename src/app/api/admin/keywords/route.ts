import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { keywordsPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/keywords — update keyword synonym groups. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(keywordsPatchSchema, body);
    if (!v.success) return v.response;

    const { keywords } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { keywords },
    });

    logAudit(tenantId, userId, "update", "keywords", `Updated keyword groups (${keywords.length} groups)`);
    createConfigVersion(tenantId, request, "keywords");

    return NextResponse.json({ keywords: config.keywords });
  } catch {
    return NextResponse.json({ error: "Failed to update keywords" }, { status: 500 });
  }
}
