import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";

/** PATCH /api/admin/content-types — update content types list. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

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

    logAudit(tenantId, userId, "update", "content-types", `Updated content types (${contentTypes.length} items)`);
    createConfigVersion(tenantId, request, "content-types");

    return NextResponse.json({ contentTypes: config.contentTypes });
  } catch {
    return NextResponse.json(
      { error: "Failed to update content types" },
      { status: 500 }
    );
  }
}
