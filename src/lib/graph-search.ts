import { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./msal-config";
import { buildKqlFilter, SEARCH_FIELDS, type MetadataFilters, type TenantTaxonomyConfig } from "./taxonomy";
import { deduplicateHits } from "./content-prep";
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
 *  driveItem: resource.listItem.fields
 *  listItem: resource.fields (fields directly on resource) */
function getFields(hit: SearchHit): Record<string, string> | undefined {
  return hit.resource.listItem?.fields ?? hit.resource.fields;
}

/** Normalize a search hit to ensure name, webUrl, and fields are accessible.
 *  Handles both driveItem (has name/webUrl) and listItem (has fields only). */
function normalizeHit(hit: SearchHit, rootUrl?: string): SearchHit {
  const fields = getFields(hit);

  // Ensure name exists — fallback to FileLeafRef or Title from fields
  if (!hit.resource.name && fields) {
    hit.resource.name = fields.FileLeafRef || fields.Title || "";
  }

  // Ensure webUrl exists — construct from FileRef if available
  if (!hit.resource.webUrl && fields?.FileRef && rootUrl) {
    hit.resource.webUrl = `${rootUrl}${fields.FileRef}`;
  }

  // Ensure listItem.fields is populated for downstream code that expects this shape
  if (!hit.resource.listItem && fields) {
    hit.resource.listItem = { fields };
  }

  return hit;
}

/** Extract the SharePoint root URL (e.g. https://contoso.sharepoint.com)
 *  from any hit that has a webUrl, for constructing URLs on listItem hits. */
function extractRootUrl(hits: SearchHit[]): string | undefined {
  for (const hit of hits) {
    const url = hit.resource.webUrl;
    if (url) {
      try {
        const parsed = new URL(url);
        return parsed.origin;
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

export async function searchSharePoint(
  msalInstance: IPublicClientApplication,
  query: string,
  filters?: MetadataFilters,
  pageSize: number = 15,
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

  // Step 3: Query SharePoint via Graph Search API
  // Include both driveItem and listItem to maximize results
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

  // ── DEBUG: Log raw Graph API response ──
  console.group("[search-debug] Graph API Response");
  console.log("KQL sent:", queryString);
  console.log("Raw response containers:", data.value?.[0]?.hitsContainers?.length);

  const container = data.value?.[0]?.hitsContainers?.[0];
  if (!container || !container.hits) {
    console.log("No hits container or empty hits");
    console.groupEnd();
    return { hits: [], total: 0, moreResultsAvailable: false, intent };
  }

  console.log("Total reported:", container.total);
  console.log("Hits returned:", container.hits.length);

  // Log first 3 raw hits to see actual structure
  container.hits.slice(0, 3).forEach((hit, i) => {
    console.group(`[search-debug] Raw hit #${i + 1}`);
    console.log("hitId:", hit.hitId);
    console.log("@odata.type:", hit.resource?.["@odata.type"]);
    console.log("resource.name:", hit.resource?.name);
    console.log("resource.webUrl:", hit.resource?.webUrl);
    console.log("resource.size:", hit.resource?.size);
    console.log("resource.lastModifiedDateTime:", hit.resource?.lastModifiedDateTime);
    console.log("resource.listItem:", hit.resource?.listItem);
    console.log("resource.fields:", hit.resource?.fields);
    console.log("resource (all keys):", Object.keys(hit.resource || {}));
    console.log("hit (all keys):", Object.keys(hit));
    console.log("summary:", hit.summary?.slice(0, 100));
    console.groupEnd();
  });
  // ── END DEBUG ──

  // Step 4: Normalize hits — handle both driveItem and listItem resource shapes
  const rootUrl = extractRootUrl(container.hits);
  console.log("[search-debug] Extracted rootUrl:", rootUrl);

  const normalized = container.hits.map((hit) => normalizeHit(hit, rootUrl));

  // Log first 3 normalized hits
  normalized.slice(0, 3).forEach((hit, i) => {
    console.log(`[search-debug] Normalized hit #${i + 1}:`, {
      name: hit.resource.name,
      webUrl: hit.resource.webUrl,
      fields: hit.resource.listItem?.fields,
    });
  });

  // Step 5: Deduplicate + Rank (with tenant-specific weights and policies)
  const deduplicated = deduplicateHits(normalized);
  console.log("[search-debug] After dedup:", deduplicated.length, "hits (from", normalized.length, ")");

  const ranked = rankResults(deduplicated, {
    query: intent.refinedQuery,
    intent: intent.intent,
    filters: mergedFilters,
    sortByRecency: intent.sortByRecency,
    searchBehaviour: config?.searchBehaviour,
    reviewPolicies: config?.reviewPolicies,
  });
  console.log("[search-debug] Final ranked results:", ranked.length);
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
