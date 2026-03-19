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

interface DiscoveredColumn {
  name: string;
  displayName: string;
  type: string;
  indexed: boolean;
  readOnly: boolean;
}

/** Map Graph columnDefinition type object to a simple type string. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveColumnType(col: any): string {
  if (col.text) return "Text";
  if (col.choice) return "Choice";
  if (col.number) return "Number";
  if (col.dateTime) return "DateTime";
  if (col.boolean) return "YesNo";
  if (col.currency) return "Currency";
  if (col.lookup) return "Lookup";
  if (col.personOrGroup) return "PersonOrGroup";
  if (col.calculated) return "Calculated";
  if (col.contentApprovalStatus) return "ContentApprovalStatus";
  if (col.hyperlinkOrPicture) return "Hyperlink";
  if (col.geolocation) return "Geolocation";
  return "Text";
}

/** Fetch site columns from the root SharePoint site via Microsoft Graph API.
 *  Uses /v1.0/sites/root/columns — works with Sites.Read.All (Graph token). */
async function fetchSiteColumns(token: string): Promise<DiscoveredColumn[]> {
  const allColumns: DiscoveredColumn[] = [];
  let nextUrl: string | null =
    "https://graph.microsoft.com/v1.0/sites/root/columns?$top=250";

  while (nextUrl) {
    console.log("[search-schema] Fetching:", nextUrl);
    const response: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[search-schema] Graph columns API failed:", response.status, text.slice(0, 500));
      throw new Error(
        `Graph columns API failed (${response.status}): ${text.slice(0, 200)}`
      );
    }

    const data: { value?: unknown[]; "@odata.nextLink"?: string } = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns: any[] = data.value ?? [];
    console.log("[search-schema] Got", columns.length, "columns in this page");

    for (const col of columns) {
      if (!col.name) continue;
      // Skip hidden/system columns that start with _ (internal SharePoint columns)
      if (col.hidden && col.name.startsWith("_")) continue;

      allColumns.push({
        name: col.name,
        displayName: col.displayName ?? col.name,
        type: resolveColumnType(col),
        indexed: Boolean(col.indexed),
        readOnly: Boolean(col.readOnly),
      });
    }

    nextUrl = data["@odata.nextLink"] ?? null;
  }

  console.log("[search-schema] Total columns discovered:", allColumns.length);
  return allColumns;
}

async function scrapeAndStore(
  tenantId: string,
  token: string
): Promise<{ properties: unknown[]; source: string; count: number }> {
  const columns = await fetchSiteColumns(token);
  const now = new Date();

  // Upsert all columns as discovered properties
  for (const col of columns) {
    await prisma.discoveredProperty.upsert({
      where: {
        tenantId_name: { tenantId, name: col.name },
      },
      create: {
        tenantId,
        name: col.name,
        type: col.type,
        searchable: true,
        queryable: true,
        retrievable: !col.readOnly,
        refinable: col.indexed || col.type === "Choice",
        mappings: col.displayName !== col.name ? col.displayName : null,
        lastScrapedAt: now,
      },
      update: {
        type: col.type,
        searchable: true,
        queryable: true,
        retrievable: !col.readOnly,
        refinable: col.indexed || col.type === "Choice",
        mappings: col.displayName !== col.name ? col.displayName : null,
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
