import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole } from "@/lib/admin-auth";

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** GET /api/admin/search-schema — return cached properties, re-scrape if stale.
 *  Use ?refresh to force re-scrape. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  const { tenantId } = auth;
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.has("refresh");

  try {
    if (!forceRefresh) {
      const cached = await prisma.discoveredProperty.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });

      if (cached.length > 0) {
        const freshest = cached.reduce((a, b) =>
          a.lastScrapedAt > b.lastScrapedAt ? a : b
        );
        const age = Date.now() - freshest.lastScrapedAt.getTime();
        if (age < STALE_MS) {
          return NextResponse.json({
            properties: cached,
            source: "cache",
            count: cached.length,
          });
        }
      }
    }

    // Scrape fresh data — prefer X-SharePoint-Token (has Sites.Read.All) over admin token
    const spToken = request.headers.get("x-sharepoint-token")
      || request.headers.get("authorization")?.replace("Bearer ", "")
      || "";
    const result = await scrapeAndStore(tenantId, spToken);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[search-schema] GET error:", message);
    return NextResponse.json(
      { error: `Failed to load search schema: ${message}` },
      { status: 500 }
    );
  }
}

/** POST /api/admin/search-schema — force re-scrape. */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  const { tenantId } = auth;

  try {
    // Prefer X-SharePoint-Token (has Sites.Read.All) over admin token
    const spToken = request.headers.get("x-sharepoint-token")
      || request.headers.get("authorization")?.replace("Bearer ", "")
      || "";
    const result = await scrapeAndStore(tenantId, spToken);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[search-schema] POST error:", message);
    return NextResponse.json(
      { error: `Failed to scrape search schema: ${message}` },
      { status: 500 }
    );
  }
}

// ── Internal ──────────────────────────────────────────────────────────

interface ManagedPropertyResult {
  ManagedPropertyName: string;
  ManagedPropertyType: string;
  Searchable: boolean;
  Queryable: boolean;
  Retrievable: boolean;
  Refinable: string; // "Yes" | "No" | "active" | "latent" etc.
  Mappings?: string;
}

async function getSharePointRoot(token: string): Promise<string> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/sites/root",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    throw new Error(`Failed to get SharePoint root: ${response.status}`);
  }
  const data = await response.json();
  // data.webUrl is like "https://contoso.sharepoint.com"
  return data.webUrl;
}

async function fetchManagedProperties(
  spRoot: string,
  token: string
): Promise<ManagedPropertyResult[]> {
  // SharePoint REST API for managed properties
  const url = `${spRoot}/_api/search/query?querytext='*'&properties='EnableQueryRules:false'&selectproperties='ManagedPropertyName,ManagedPropertyType,Searchable,Queryable,Retrievable,Refinable,Mappings'&sourceid='8413cd39-2156-4e00-b54d-11efd9abdb89'`;

  // Fall back to the search schema endpoint
  const schemaUrl = `${spRoot}/_api/search/schema/managedproperties?$filter=Queryable%20eq%20true&$top=500`;

  const response = await fetch(schemaUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=verbose",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `SharePoint schema API failed (${response.status}): ${text.slice(0, 200)}`
    );
  }

  const data = await response.json();

  // SharePoint REST API returns results in d.results (OData verbose) or value
  const results =
    data.d?.results ?? data.value ?? [];

  return results.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      ManagedPropertyName: p.ManagedPropertyName ?? p.Name ?? p.name ?? "",
      ManagedPropertyType: mapType(p.ManagedPropertyType ?? p.Type ?? 0),
      Searchable: Boolean(p.Searchable ?? p.searchable ?? false),
      Queryable: Boolean(p.Queryable ?? p.queryable ?? true),
      Retrievable: Boolean(p.Retrievable ?? p.retrievable ?? false),
      Refinable:
        typeof p.Refinable === "string"
          ? p.Refinable
          : p.Refiner ?? (p.refinable ? "Yes" : "No"),
      Mappings: formatMappings(p.Mappings ?? p.mappings),
    })
  );
}

function mapType(type: number | string): string {
  if (typeof type === "string") return type;
  const types: Record<number, string> = {
    0: "Text",
    1: "Integer",
    2: "Decimal",
    3: "DateTime",
    4: "YesNo",
    5: "Double",
    6: "Binary",
  };
  return types[type] ?? `Unknown(${type})`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatMappings(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((m) =>
        typeof m === "string"
          ? m
          : m.CrawledPropertyName ?? m.crawledPropertyName ?? ""
      )
      .filter(Boolean)
      .join(", ");
  }
  // OData results wrapper
  if (raw.results && Array.isArray(raw.results)) {
    return formatMappings(raw.results);
  }
  return null;
}

async function scrapeAndStore(
  tenantId: string,
  token: string
): Promise<{ properties: unknown[]; source: string; count: number }> {
  const spRoot = await getSharePointRoot(token);
  const managed = await fetchManagedProperties(spRoot, token);
  const now = new Date();

  // Upsert all properties
  for (const prop of managed) {
    if (!prop.ManagedPropertyName) continue;
    await prisma.discoveredProperty.upsert({
      where: {
        tenantId_name: { tenantId, name: prop.ManagedPropertyName },
      },
      create: {
        tenantId,
        name: prop.ManagedPropertyName,
        type: prop.ManagedPropertyType,
        searchable: prop.Searchable,
        queryable: prop.Queryable,
        retrievable: prop.Retrievable,
        refinable: prop.Refinable !== "No",
        mappings: prop.Mappings,
        lastScrapedAt: now,
      },
      update: {
        type: prop.ManagedPropertyType,
        searchable: prop.Searchable,
        queryable: prop.Queryable,
        retrievable: prop.Retrievable,
        refinable: prop.Refinable !== "No",
        mappings: prop.Mappings,
        lastScrapedAt: now,
      },
    });
  }

  const properties = await prisma.discoveredProperty.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return { properties, source: "scraped", count: properties.length };
}
