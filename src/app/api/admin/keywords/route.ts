import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";

/** PATCH /api/admin/keywords — update keyword synonym groups. */
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
    const { keywords } = body;

    if (!Array.isArray(keywords)) {
      return NextResponse.json({ error: "keywords must be an array" }, { status: 400 });
    }

    // Validate structure: each entry must have term (string) and synonyms (string[])
    for (const entry of keywords) {
      if (typeof entry.term !== "string" || !entry.term.trim()) {
        return NextResponse.json({ error: "Each keyword must have a non-empty term" }, { status: 400 });
      }
      if (!Array.isArray(entry.synonyms) || !entry.synonyms.every((s: unknown) => typeof s === "string")) {
        return NextResponse.json({ error: "Each keyword must have a synonyms array of strings" }, { status: 400 });
      }
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { keywords },
    });

    const userId = request.headers.get("x-user-id") || "";
    logAudit(tenantId, userId, "update", "keywords", `Updated keyword groups (${keywords.length} groups)`);

    return NextResponse.json({ keywords: config.keywords });
  } catch {
    return NextResponse.json({ error: "Failed to update keywords" }, { status: 500 });
  }
}
