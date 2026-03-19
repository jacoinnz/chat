import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, createConfigVersion } from "@/lib/admin-auth";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
  DEFAULT_KEYWORDS,
  DEFAULT_REVIEW_POLICIES,
  DEFAULT_SEARCH_BEHAVIOUR,
} from "@/lib/taxonomy-defaults";

/** POST /api/admin/config/initialize — create TenantConfig with defaults + wizard overrides. */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  const { tenantId } = auth;

  // Check if config already exists
  const existing = await prisma.tenantConfig.findUnique({
    where: { tenantId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Configuration already exists for this tenant" },
      { status: 409 }
    );
  }

  let body: {
    kqlPropertyMap?: Record<string, string>;
    searchFields?: string[];
  } = {};
  try {
    body = await request.json();
  } catch {
    // No body or invalid JSON — use all defaults
  }

  const kqlPropertyMap = body.kqlPropertyMap
    ? { ...DEFAULT_KQL_PROPERTY_MAP, ...body.kqlPropertyMap }
    : DEFAULT_KQL_PROPERTY_MAP;

  const searchFields = body.searchFields
    ? [...new Set([...DEFAULT_SEARCH_FIELDS, ...body.searchFields])]
    : DEFAULT_SEARCH_FIELDS;

  try {
    // Upsert Tenant row
    await prisma.tenant.upsert({
      where: { tenantId },
      create: {
        tenantId,
        onboardingStatus: "setup_complete",
      },
      update: {
        onboardingStatus: "setup_complete",
      },
    });

    // Create TenantConfig with defaults + overrides
    // JSON.parse(JSON.stringify(...)) ensures typed objects satisfy Prisma's InputJsonValue
    await prisma.tenantConfig.create({
      data: {
        tenantId,
        taxonomy: DEFAULT_TAXONOMY,
        contentTypes: DEFAULT_CONTENT_TYPES,
        kqlPropertyMap,
        searchFields,
        keywords: JSON.parse(JSON.stringify(DEFAULT_KEYWORDS)),
        reviewPolicies: JSON.parse(JSON.stringify(DEFAULT_REVIEW_POLICIES)),
        searchBehaviour: JSON.parse(JSON.stringify(DEFAULT_SEARCH_BEHAVIOUR)),
      },
    });

    // Create initial config version (fire-and-forget)
    createConfigVersion(tenantId, request, "onboarding", "published", "Initial setup via onboarding wizard");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to initialize configuration" },
      { status: 500 }
    );
  }
}
