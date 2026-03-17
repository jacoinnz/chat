import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole } from "@/lib/admin-auth";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
} from "@/lib/taxonomy-defaults";

/** POST /api/admin/reset — reset config to defaults. Requires { confirm: true }. */
export async function POST(request: Request) {
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
    if (body.confirm !== true) {
      return NextResponse.json(
        { error: "Confirmation required. Send { confirm: true }." },
        { status: 400 }
      );
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: {
        taxonomy: DEFAULT_TAXONOMY,
        contentTypes: DEFAULT_CONTENT_TYPES,
        kqlPropertyMap: DEFAULT_KQL_PROPERTY_MAP,
        searchFields: DEFAULT_SEARCH_FIELDS,
      },
    });

    return NextResponse.json({
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      updatedAt: config.updatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reset config" },
      { status: 500 }
    );
  }
}
