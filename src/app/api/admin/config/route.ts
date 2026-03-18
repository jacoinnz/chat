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
import { fullConfigSchema, validateBody } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

// Prisma Json fields require InputJsonValue — cast typed defaults
const json = <T>(v: T) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/** GET /api/admin/config — fetch tenant config, auto-provisions on first admin access. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;

  try {
    const tenant = await prisma.tenant.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });

    let config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      config = await prisma.tenantConfig.create({
        data: {
          tenantId,
          taxonomy: json(DEFAULT_TAXONOMY),
          contentTypes: json(DEFAULT_CONTENT_TYPES),
          kqlPropertyMap: json(DEFAULT_KQL_PROPERTY_MAP),
          searchFields: json(DEFAULT_SEARCH_FIELDS),
          keywords: json(DEFAULT_KEYWORDS),
          reviewPolicies: json(DEFAULT_REVIEW_POLICIES),
          searchBehaviour: json(DEFAULT_SEARCH_BEHAVIOUR),
        },
      });
    }

    // Fetch version metadata
    const latestPublished = await prisma.configVersion.findFirst({
      where: { tenantId, status: "published" },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const draft = await prisma.configVersion.findFirst({
      where: { tenantId, status: "draft" },
      orderBy: { version: "desc" },
      select: { version: true, authorName: true, createdAt: true },
    });

    return NextResponse.json({
      tenantName: tenant.name,
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      keywords: config.keywords ?? DEFAULT_KEYWORDS,
      reviewPolicies: config.reviewPolicies ?? DEFAULT_REVIEW_POLICIES,
      searchBehaviour: config.searchBehaviour ?? DEFAULT_SEARCH_BEHAVIOUR,
      updatedAt: config.updatedAt,
      currentVersion: latestPublished?.version ?? 0,
      hasDraft: !!draft,
      draft: draft ? { version: draft.version, authorName: draft.authorName, createdAt: draft.createdAt } : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

/** PUT /api/admin/config — replace entire tenant config. */
export async function PUT(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(fullConfigSchema, body);
    if (!v.success) return v.response;

    const { taxonomy, contentTypes, kqlPropertyMap, searchFields, keywords, reviewPolicies, searchBehaviour } = v.data;

    await prisma.tenant.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });

    const config = await prisma.tenantConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        taxonomy,
        contentTypes,
        kqlPropertyMap,
        searchFields,
        keywords: json(keywords ?? DEFAULT_KEYWORDS),
        reviewPolicies: json(reviewPolicies ?? DEFAULT_REVIEW_POLICIES),
        searchBehaviour: json(searchBehaviour ?? DEFAULT_SEARCH_BEHAVIOUR),
      },
      update: {
        taxonomy,
        contentTypes,
        kqlPropertyMap,
        searchFields,
        ...(keywords ? { keywords: json(keywords) } : {}),
        ...(reviewPolicies ? { reviewPolicies: json(reviewPolicies) } : {}),
        ...(searchBehaviour ? { searchBehaviour: json(searchBehaviour) } : {}),
      },
    });

    configCache.invalidate(tenantId);
    logAudit(tenantId, userId, "update", "config", "Replaced full tenant configuration");
    createConfigVersion(tenantId, request, "config");

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
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
