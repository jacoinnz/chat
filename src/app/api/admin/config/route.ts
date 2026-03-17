import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole } from "@/lib/admin-auth";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
} from "@/lib/taxonomy-defaults";

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
    // Auto-provision tenant and config on first admin access
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
          taxonomy: DEFAULT_TAXONOMY,
          contentTypes: DEFAULT_CONTENT_TYPES,
          kqlPropertyMap: DEFAULT_KQL_PROPERTY_MAP,
          searchFields: DEFAULT_SEARCH_FIELDS,
        },
      });
    }

    return NextResponse.json({
      tenantName: tenant.name,
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
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
    const { taxonomy, contentTypes, kqlPropertyMap, searchFields } = body;

    if (!taxonomy || !contentTypes || !kqlPropertyMap || !searchFields) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure tenant exists
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
      },
      update: {
        taxonomy,
        contentTypes,
        kqlPropertyMap,
        searchFields,
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
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
