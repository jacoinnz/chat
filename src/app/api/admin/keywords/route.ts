import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";

/** PATCH /api/admin/keywords — update keyword synonym groups. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

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

    logAudit(tenantId, userId, "update", "keywords", `Updated keyword groups (${keywords.length} groups)`);
    createConfigVersion(tenantId, request, "keywords");

    return NextResponse.json({ keywords: config.keywords });
  } catch {
    return NextResponse.json({ error: "Failed to update keywords" }, { status: 500 });
  }
}
