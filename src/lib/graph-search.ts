import { GraphClient } from "./graph-client";
import { buildKqlFilter, ESSENTIAL_FIELDS, SEARCH_FIELDS, type MetadataFilters, type TenantTaxonomyConfig } from "./taxonomy";
import { deduplicateHits } from "./content-prep";
import { normalizeHit } from "./normalize-hit";
import { analyzeIntent, type IntentResult } from "./intent";
import { rankResults } from "./ranking";
import { sanitizeForKql } from "./safety";
import type { SearchResponse, SearchHit, SharePointSite } from "@/types/search";

const GRAPH_SEARCH_ENDPOINT = "https://graph.microsoft.com/v1.0/search/query";

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

export async function searchSharePoint(
  client: GraphClient,
  query: string,
  filters?: MetadataFilters,
  pageSize: number = 500,
  config?: TenantTaxonomyConfig
): Promise<{
  hits: SearchHit[];
  total: number;
  moreResultsAvailable: boolean;
  intent: IntentResult;
}> {
  // Use the higher of tenant config vs default — prevents stale DB values (e.g. old
  // default of 15) from capping results below the current code default.
  const effectivePageSize = Math.max(config?.searchBehaviour?.maxResults ?? 0, pageSize);

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

  // IMPORTANT: Essential fields (FileLeafRef, FileRef, Path, Filename, Title) must
  // ALWAYS be requested or normalizeHit() cannot reconstruct webUrl/name.
  // Never allow tenant config to override these — only extend them.
  const tenantFields = config?.searchFields ?? SEARCH_FIELDS;
  const searchFields = Array.from(new Set([...ESSENTIAL_FIELDS, ...tenantFields]));

  // Get SharePoint root URL for constructing file URLs from server-relative paths
  const sharePointRoot = await client.getSharePointRoot();

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

  const response = await client.post(GRAPH_SEARCH_ENDPOINT, requestBody);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph search failed (${response.status}): ${errorBody}`);
  }

  const data: SearchResponse = await response.json();

  const container = data.value?.[0]?.hitsContainers?.[0];
  if (!container || !container.hits) {
    return { hits: [], total: 0, moreResultsAvailable: false, intent };
  }

  // Step 4: Normalize hits — fill in name/webUrl from fields
  const normalized = container.hits.map((hit) => normalizeHit(hit, sharePointRoot));

  // Step 5: Deduplicate + Rank
  const deduplicated = deduplicateHits(normalized);

  const ranked = rankResults(deduplicated, {
    query: intent.refinedQuery,
    intent: intent.intent,
    filters: mergedFilters,
    sortByRecency: intent.sortByRecency,
    searchBehaviour: config?.searchBehaviour,
    reviewPolicies: config?.reviewPolicies,
  });

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
  client: GraphClient
): Promise<SharePointSite[]> {
  const response = await client.get(
    "https://graph.microsoft.com/v1.0/sites?search=*&$select=id,displayName,webUrl&$top=50"
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
