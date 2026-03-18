import { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./msal-config";
import { buildKqlFilter, SEARCH_FIELDS, type MetadataFilters, type TenantTaxonomyConfig } from "./taxonomy";
import { deduplicateHits, stripHighlightTags } from "./content-prep";
import { analyzeIntent, type IntentResult } from "./intent";
import { rankResults } from "./ranking";
import { sanitizeForKql } from "./safety";
import type { SearchResponse, SearchHit, SharePointSite } from "@/types/search";

const GRAPH_SEARCH_ENDPOINT = "https://graph.microsoft.com/v1.0/search/query";

async function getAccessToken(
  msalInstance: IPublicClientApplication
): Promise<string> {
  let account = msalInstance.getActiveAccount();
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      account = accounts[0];
    } else {
      throw new Error("No active account. Please sign in first.");
    }
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: graphScopes.search,
      account,
    });
    return response.accessToken;
  } catch {
    await msalInstance.acquireTokenRedirect({
      scopes: graphScopes.search,
    });
    return "";
  }
}

/** Derive the SharePoint root URL from the MSAL account.
 *  e.g. user@contoso.onmicrosoft.com → https://contoso.sharepoint.com
 *  or   user@contoso.com → https://contoso.sharepoint.com */
function getSharePointRoot(msalInstance: IPublicClientApplication): string | undefined {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account?.username) return undefined;

  const domain = account.username.split("@")[1];
  if (!domain) return undefined;

  // Extract tenant name from domain
  // contoso.onmicrosoft.com → contoso
  // contoso.com → contoso
  const tenant = domain.replace(".onmicrosoft.com", "").split(".")[0];
  return `https://${tenant}.sharepoint.com`;
}

/** @internal Merge detected filters with manual filters (manual takes priority) */
export function mergeFilters(
  manual: MetadataFilters,
  detected: Partial<MetadataFilters>
): MetadataFilters {
  return {
    ...detected,
    ...Object.fromEntries(
      Object.entries(manual).filter(([, v]) => v !== undefined)
    ),
  } as MetadataFilters;
}

/** @internal Build enhanced KQL parts from intent analysis.
 *  Skips FileType/date KQL when the filter bar already provides those values
 *  to avoid contradictory or duplicate conditions. */
export function buildIntentKql(intent: IntentResult, filters: MetadataFilters): string {
  const parts: string[] = [];

  if (intent.author) {
    parts.push(`Author:"${sanitizeForKql(intent.author)}"`);
  }

  // Skip intent-detected file type when filter bar already sets one
  if (intent.fileType && !filters.fileType) {
    parts.push(`FileType:${intent.fileType}`);
  }

  // Skip intent-detected recency date when filter bar already sets a date range
  if (intent.sortByRecency && !filters.dateRange) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
    parts.push(`LastModifiedTime>=${dateStr}`);
  }

  return parts.join(" AND ");
}

/** Get the fields object from a search hit regardless of entity type.
 *  Graph API nests fields at resource.listItem.fields for driveItem results.
 *  Normalizes keys to PascalCase since Graph returns camelCase. */
function getFields(hit: SearchHit): Record<string, string> | undefined {
  const raw = hit.resource.listItem?.fields ?? hit.resource.fields;
  if (!raw) return undefined;
  // Graph returns camelCase keys (e.g. "contentType") but our display code
  // expects PascalCase ("ContentType"). Add PascalCase aliases.
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key] = value;
    const pascal = key.charAt(0).toUpperCase() + key.slice(1);
    if (pascal !== key) normalized[pascal] = value;
  }
  return normalized;
}

/** Map MIME types to file extensions for display when name is missing */
const MIME_TO_EXT: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
};

/** Extract a usable file extension from the contentType field.
 *  Graph returns: "application/vnd...sheet\n\nDocument" — we need the MIME part only. */
function extractExtFromContentType(ct?: string): string | undefined {
  if (!ct) return undefined;
  const mime = ct.split("\n")[0].trim();
  return MIME_TO_EXT[mime];
}

/** Helper to find a field value by trying multiple key names (PascalCase + camelCase). */
function findField(fields: Record<string, string> | undefined, ...keys: string[]): string | undefined {
  if (!fields) return undefined;
  for (const key of keys) {
    if (fields[key]) return fields[key];
  }
  return undefined;
}

/** Normalize a search hit to ensure name, webUrl, and fields are accessible.
 *  Graph Search API returns driveItem resources with only @odata.type and
 *  listItem — no name/webUrl/size. We reconstruct from available fields. */
function normalizeHit(hit: SearchHit, rootUrl?: string): SearchHit {
  const fields = getFields(hit);

  // ── webUrl: try multiple field names ──
  if (!hit.resource.webUrl) {
    // Path = search managed property, FileRef = list column (server-relative)
    const fullPath = findField(fields, "Path", "path");
    const fileRef = findField(fields, "FileRef", "fileRef");
    if (fullPath) {
      hit.resource.webUrl = fullPath;
    } else if (fileRef && rootUrl) {
      hit.resource.webUrl = `${rootUrl}${fileRef.startsWith("/") ? "" : "/"}${fileRef}`;
    }
  }

  // ── name: try multiple field names ──
  if (!hit.resource.name) {
    // FileLeafRef = list column filename, Filename = managed property
    const filename = findField(fields, "FileLeafRef", "fileLeafRef", "Filename", "filename");
    const title = findField(fields, "Title", "title");
    if (filename) {
      hit.resource.name = filename;
    } else if (title) {
      hit.resource.name = title;
    } else {
      // Last resort: derive from MIME type + summary snippet
      const ext = extractExtFromContentType(findField(fields, "ContentType", "contentType"));
      const cleanSummary = hit.summary ? stripHighlightTags(hit.summary) : "";
      const summarySnippet = cleanSummary.slice(0, 60)?.split(/[.\n]/)[0]?.trim();
      hit.resource.name = summarySnippet
        ? `${summarySnippet}${ext ? `.${ext}` : ""}`
        : ext ? `Document.${ext}` : "";
    }
  }

  // ── Fill in missing standard properties ──
  if (!hit.resource.lastModifiedDateTime) {
    hit.resource.lastModifiedDateTime = findField(fields, "LastModifiedTime", "lastModifiedTime", "Last Modified", "Modified");
  }
  if (!hit.resource.createdDateTime) {
    hit.resource.createdDateTime = findField(fields, "Created", "created");
  }
  if (!hit.resource.size) {
    const sizeStr = findField(fields, "Size", "size");
    if (sizeStr) hit.resource.size = parseInt(sizeStr, 10) || undefined;
  }
  if (!hit.resource.lastModifiedBy?.user?.displayName) {
    const author = findField(fields, "Author", "author");
    if (author) hit.resource.lastModifiedBy = { user: { displayName: author } };
  }

  // Ensure listItem.fields is populated for downstream code
  if (!hit.resource.listItem && fields) {
    hit.resource.listItem = { fields };
  } else if (hit.resource.listItem && fields) {
    hit.resource.listItem.fields = fields;
  }

  return hit;
}

export async function searchSharePoint(
  msalInstance: IPublicClientApplication,
  query: string,
  filters?: MetadataFilters,
  pageSize: number = 25,
  config?: TenantTaxonomyConfig
): Promise<{
  hits: SearchHit[];
  total: number;
  moreResultsAvailable: boolean;
  intent: IntentResult;
}> {
  const accessToken = await getAccessToken(msalInstance);

  // Use tenant-specific max results if configured
  const effectivePageSize = config?.searchBehaviour?.maxResults ?? pageSize;

  // Step 2: Identify intent (using tenant config if available)
  const intent = analyzeIntent(query, config);

  // Merge auto-detected filters with manual filters
  const mergedFilters = mergeFilters(filters || {}, intent.detectedFilters);

  // Build KQL from merged filters + intent extras (using tenant config if available)
  const filterKql = buildKqlFilter(mergedFilters, config);
  const intentKql = buildIntentKql(intent, mergedFilters);

  // Combine: sanitized refined query + filter KQL + intent KQL
  const safeQuery = sanitizeForKql(intent.refinedQuery);
  const kqlParts = [safeQuery, filterKql, intentKql].filter(Boolean);
  const queryString = kqlParts.join(" ");

  // Guard against empty queries
  if (!queryString.trim()) {
    return { hits: [], total: 0, moreResultsAvailable: false, intent };
  }

  // Use tenant-specific search fields or defaults
  const searchFields = config?.searchFields ?? [...SEARCH_FIELDS];

  // Get SharePoint root URL for constructing file URLs from server-relative paths
  const sharePointRoot = getSharePointRoot(msalInstance);

  // Step 3: Query SharePoint via Graph Search API
  const requestBody = {
    requests: [
      {
        entityTypes: ["driveItem", "listItem"],
        query: {
          queryString,
        },
        fields: searchFields,
        from: 0,
        size: effectivePageSize,
      },
    ],
  };

  const response = await fetch(GRAPH_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph search failed (${response.status}): ${errorBody}`);
  }

  const data: SearchResponse = await response.json();

  const container = data.value?.[0]?.hitsContainers?.[0];
  if (!container || !container.hits) {
    return { hits: [], total: 0, moreResultsAvailable: false, intent };
  }

  // ── DEBUG: Log raw response + fields content ──
  console.group("[search-debug] Graph API Response");
  console.log("KQL:", queryString);
  console.log("Requested fields:", searchFields);
  console.log("SharePoint root:", sharePointRoot);
  console.log("Total:", container.total, "| Returned:", container.hits.length, "| effectivePageSize:", effectivePageSize);

  container.hits.slice(0, 3).forEach((hit, i) => {
    const rawFields = hit.resource.listItem?.fields ?? hit.resource.fields;
    console.log(`[search-debug] Hit #${i + 1} RAW:`, {
      hitId: hit.hitId,
      type: hit.resource?.["@odata.type"],
      name: hit.resource?.name,
      webUrl: hit.resource?.webUrl,
      listItemId: hit.resource.listItem?.id,
      resourceKeys: Object.keys(hit.resource || {}),
      allFieldKeys: rawFields ? Object.keys(rawFields) : "none",
      fieldsContent: rawFields ? { ...rawFields } : "none",
      summary: hit.summary?.slice(0, 80),
    });
  });
  // ── END DEBUG ──

  // Step 4: Normalize hits — fill in name/webUrl from fields
  const normalized = container.hits.map((hit) => normalizeHit(hit, sharePointRoot));

  // Log normalization results
  normalized.slice(0, 3).forEach((hit, i) => {
    console.log(`[search-debug] Normalized #${i + 1}:`, {
      name: hit.resource.name,
      webUrl: hit.resource.webUrl,
      lastModified: hit.resource.lastModifiedDateTime,
      author: hit.resource.lastModifiedBy?.user?.displayName,
      size: hit.resource.size,
    });
  });

  // Step 5: Deduplicate + Rank
  const deduplicated = deduplicateHits(normalized);
  console.log("[search-debug] Dedup:", normalized.length, "→", deduplicated.length);

  const ranked = rankResults(deduplicated, {
    query: intent.refinedQuery,
    intent: intent.intent,
    filters: mergedFilters,
    sortByRecency: intent.sortByRecency,
    searchBehaviour: config?.searchBehaviour,
    reviewPolicies: config?.reviewPolicies,
  });
  console.log("[search-debug] Final:", ranked.length, "results");
  console.groupEnd();

  return {
    hits: ranked,
    total: container.total,
    moreResultsAvailable: container.moreResultsAvailable,
    intent,
  };
}

/** Fetch SharePoint sites the current user has access to.
 *  Uses GET /sites?search=* which requires Sites.Read.All scope. */
export async function fetchUserSites(
  msalInstance: IPublicClientApplication
): Promise<SharePointSite[]> {
  const accessToken = await getAccessToken(msalInstance);
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/sites?search=*&$select=id,displayName,webUrl&$top=50",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.value || []).map(
    (site: { id: string; displayName: string; webUrl: string }) => ({
      id: site.id,
      displayName: site.displayName,
      webUrl: site.webUrl,
    })
  );
}
