import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, createConfigVersion } from "@/lib/admin-auth";
import { draftPostSchema, validateBody } from "@/lib/validations";

/** GET /api/admin/config/draft — return current draft snapshot or null. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;

  try {
    const draft = await prisma.configVersion.findFirst({
      where: { tenantId, status: "draft" },
      orderBy: { version: "desc" },
    });

    if (!draft) {
      return NextResponse.json({ draft: null });
    }

    return NextResponse.json({
      draft: {
        id: draft.id,
        version: draft.version,
        snapshot: draft.snapshot,
        authorName: draft.authorName,
        comment: draft.comment,
        createdAt: draft.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
}

/** POST /api/admin/config/draft — save edited config as draft (at most one per tenant). */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(draftPostSchema, body);
    if (!v.success) return v.response;

    const { snapshot, comment } = v.data;

    // Delete any existing draft (enforce at-most-one)
    await prisma.configVersion.deleteMany({
      where: { tenantId, status: "draft" },
    });

    const result = await createConfigVersion(
      tenantId,
      request,
      "draft",
      "draft",
      comment || undefined,
      snapshot
    );

    return NextResponse.json({ success: true, version: result?.version ?? null });
  } catch {
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

/** DELETE /api/admin/config/draft — discard draft. */
export async function DELETE(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;

  try {
    await prisma.configVersion.deleteMany({
      where: { tenantId, status: "draft" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to discard draft" }, { status: 500 });
  }
}
