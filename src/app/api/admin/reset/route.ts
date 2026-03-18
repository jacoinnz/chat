import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, logAudit, createConfigVersion } from "@/lib/admin-auth";
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
import { resetSchema, validateBody } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

const json = <T>(v: T) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/** POST /api/admin/reset — reset config to defaults. Requires { confirm: true }. */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(resetSchema, body);
    if (!v.success) return v.response;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: {
        taxonomy: json(DEFAULT_TAXONOMY),
        contentTypes: json(DEFAULT_CONTENT_TYPES),
        kqlPropertyMap: json(DEFAULT_KQL_PROPERTY_MAP),
        searchFields: json(DEFAULT_SEARCH_FIELDS),
        keywords: json(DEFAULT_KEYWORDS),
        reviewPolicies: json(DEFAULT_REVIEW_POLICIES),
        searchBehaviour: json(DEFAULT_SEARCH_BEHAVIOUR),
      },
    });

    configCache.invalidate(tenantId);
    logAudit(tenantId, userId, "reset", "config", "Reset all configuration to defaults");
    createConfigVersion(tenantId, request, "reset");

    return NextResponse.json({
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      keywords: config.keywords,
      reviewPolicies: config.reviewPolicies,
      searchBehaviour: config.searchBehaviour,
      updatedAt: config.updatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reset config" },
      { status: 500 }
    );
  }
}
