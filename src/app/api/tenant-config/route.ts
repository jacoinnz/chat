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

// Browser-side cache: 2 minutes fresh, serve stale up to 5 minutes while revalidating.
// This is the primary caching layer in serverless — in-memory TtlCache is a bonus
// that only helps when the same container handles multiple requests.
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
  "Vary": "Authorization",
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

  // Check in-memory cache first (helps during sustained traffic on warm containers)
  const cached = configCache.get(tenantId);
  if (cached) {
    return NextResponse.json(cached, { headers: CACHE_HEADERS });
  }

  try {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      const result = { ...DEFAULTS, configExists: false };
      configCache.set(tenantId, result);
      return NextResponse.json(result, { headers: CACHE_HEADERS });
    }

    const result = {
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      keywords: config.keywords ?? DEFAULT_KEYWORDS,
      reviewPolicies: config.reviewPolicies ?? DEFAULT_REVIEW_POLICIES,
      searchBehaviour: config.searchBehaviour ?? DEFAULT_SEARCH_BEHAVIOUR,
      configExists: true,
    };

    configCache.set(tenantId, result);
    return NextResponse.json(result, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json(DEFAULTS, { headers: CACHE_HEADERS });
  }
}
