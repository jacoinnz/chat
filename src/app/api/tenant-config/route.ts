import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configCache } from "@/lib/config-cache";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
  DEFAULT_KEYWORDS,
  DEFAULT_REVIEW_POLICIES,
  DEFAULT_SEARCH_BEHAVIOUR,
} from "@/lib/taxonomy-defaults";

const DEFAULTS = {
  taxonomy: DEFAULT_TAXONOMY,
  contentTypes: DEFAULT_CONTENT_TYPES,
  kqlPropertyMap: DEFAULT_KQL_PROPERTY_MAP,
  searchFields: DEFAULT_SEARCH_FIELDS,
  keywords: DEFAULT_KEYWORDS,
  reviewPolicies: DEFAULT_REVIEW_POLICIES,
  searchBehaviour: DEFAULT_SEARCH_BEHAVIOUR,
};

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

  // Check cache first
  const cached = configCache.get(tenantId);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      configCache.set(tenantId, DEFAULTS);
      return NextResponse.json(DEFAULTS);
    }

    const result = {
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      keywords: config.keywords ?? DEFAULT_KEYWORDS,
      reviewPolicies: config.reviewPolicies ?? DEFAULT_REVIEW_POLICIES,
      searchBehaviour: config.searchBehaviour ?? DEFAULT_SEARCH_BEHAVIOUR,
    };

    configCache.set(tenantId, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
