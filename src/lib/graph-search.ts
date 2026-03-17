import { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./msal-config";
import { buildKqlFilter, type MetadataFilters } from "./taxonomy";
import { deduplicateHits } from "./content-prep";
import { analyzeIntent, type IntentResult } from "./intent";
import { rankResults } from "./ranking";
import { sanitizeForKql } from "./safety";
import type { SearchResponse, SearchHit } from "@/types/search";

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
    const response = await msalInstance.acquireTokenPopup({
      scopes: graphScopes.search,
    });
    return response.accessToken;
  }
}

/** Merge detected filters with manual filters (manual takes priority) */
function mergeFilters(
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

/** Build enhanced KQL parts from intent analysis */
function buildIntentKql(intent: IntentResult): string {
  const parts: string[] = [];

  if (intent.author) {
    parts.push(`Author:"${sanitizeForKql(intent.author)}"`);
  }

  if (intent.fileType) {
    parts.push(`FileType:${intent.fileType}`);
  }

  if (intent.sortByRecency) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
    parts.push(`LastModifiedTime>=${dateStr}`);
  }

  return parts.join(" AND ");
}

export async function searchSharePoint(
  msalInstance: IPublicClientApplication,
  query: string,
  filters?: MetadataFilters,
  pageSize: number = 15
): Promise<{
  hits: SearchHit[];
  total: number;
  moreResultsAvailable: boolean;
  intent: IntentResult;
}> {
  const accessToken = await getAccessToken(msalInstance);

  // Step 2: Identify intent
  const intent = analyzeIntent(query);

  // Merge auto-detected filters with manual filters
  const mergedFilters = mergeFilters(filters || {}, intent.detectedFilters);

  // Build KQL from merged filters + intent extras
  const filterKql = buildKqlFilter(mergedFilters);
  const intentKql = buildIntentKql(intent);

  // Combine: sanitized refined query + filter KQL + intent KQL
  const safeQuery = sanitizeForKql(intent.refinedQuery);
  const kqlParts = [safeQuery, filterKql, intentKql].filter(Boolean);
  const queryString = kqlParts.join(" ");

  // Step 3: Query SharePoint via Graph Search API
  const requestBody = {
    requests: [
      {
        entityTypes: ["driveItem", "listItem"],
        query: {
          queryString,
        },
        fields: [
          "department",
          "docType",
          "sensitivity",
          "status",
          "reviewDate",
          "keywords",
        ],
        from: 0,
        size: pageSize,
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

  // Step 4: Permissions — handled by Graph API token scoping

  // Step 5: Deduplicate + Rank
  const deduplicated = deduplicateHits(container.hits);
  const ranked = rankResults(deduplicated, {
    query: intent.refinedQuery,
    intent: intent.intent,
    filters: mergedFilters,
    sortByRecency: intent.sortByRecency,
  });

  return {
    hits: ranked,
    total: container.total,
    moreResultsAvailable: container.moreResultsAvailable,
    intent,
  };
}
