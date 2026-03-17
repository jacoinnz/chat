import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
  DEFAULT_KEYWORDS,
  DEFAULT_REVIEW_POLICIES,
  DEFAULT_SEARCH_BEHAVIOUR,
} from "@/lib/taxonomy-defaults";
import type { Prisma } from "@prisma/client";

// Prisma Json fields require InputJsonValue — cast typed defaults
const json = <T>(v: T) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

async function checkAdmin(request: Request): Promise<string | NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const isAdmin = await verifyAdminRole(token);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

  return tenantId;
}

/** GET /api/admin/config — fetch tenant config, auto-provisions on first admin access. */
export async function GET(request: Request) {
  const result = await checkAdmin(request);
  if (result instanceof NextResponse) return result;
  const tenantId = result;

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
  const result = await checkAdmin(request);
  if (result instanceof NextResponse) return result;
  const tenantId = result;

  try {
    const body = await request.json();
    const { taxonomy, contentTypes, kqlPropertyMap, searchFields, keywords, reviewPolicies, searchBehaviour } = body;

    if (!taxonomy || !contentTypes || !kqlPropertyMap || !searchFields) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    const userId = request.headers.get("x-user-id") || "";
    logAudit(tenantId, userId, "update", "config", "Replaced full tenant configuration");

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
