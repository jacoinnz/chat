import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
} from "@/lib/taxonomy-defaults";

/** GET /api/tenant-config — returns tenant config or defaults.
 *  No auto-provisioning for non-admin users. */
export async function GET(request: Request) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing tenant ID" },
      { status: 400 }
    );
  }

  try {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // Return defaults when no DB record exists
      return NextResponse.json({
        taxonomy: DEFAULT_TAXONOMY,
        contentTypes: DEFAULT_CONTENT_TYPES,
        kqlPropertyMap: DEFAULT_KQL_PROPERTY_MAP,
        searchFields: DEFAULT_SEARCH_FIELDS,
      });
    }

    return NextResponse.json({
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
    });
  } catch {
    // Return defaults on any DB error
    return NextResponse.json({
      taxonomy: DEFAULT_TAXONOMY,
      contentTypes: DEFAULT_CONTENT_TYPES,
      kqlPropertyMap: DEFAULT_KQL_PROPERTY_MAP,
      searchFields: DEFAULT_SEARCH_FIELDS,
    });
  }
}
