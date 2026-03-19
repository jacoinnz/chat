import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin-auth";

/** GET /api/admin/config/exists — lightweight check for tenant config existence. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = auth;

  try {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: { id: true },
    });

    return NextResponse.json({ exists: !!config });
  } catch {
    return NextResponse.json(
      { error: "Failed to check config" },
      { status: 500 }
    );
  }
}
