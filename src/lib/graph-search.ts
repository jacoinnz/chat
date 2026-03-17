import { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./msal-config";
import type { SearchResponse, SearchHit } from "@/types/search";

const GRAPH_SEARCH_ENDPOINT = "https://graph.microsoft.com/v1.0/search/query";

async function getAccessToken(
  msalInstance: IPublicClientApplication
): Promise<string> {
  let account = msalInstance.getActiveAccount();
  if (!account) {
    // Fallback: pick first account and set it as active
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

export async function searchSharePoint(
  msalInstance: IPublicClientApplication,
  query: string,
  pageSize: number = 15
): Promise<{
  hits: SearchHit[];
  total: number;
  moreResultsAvailable: boolean;
}> {
  const accessToken = await getAccessToken(msalInstance);

  const requestBody = {
    requests: [
      {
        entityTypes: ["driveItem"],
        query: {
          queryString: query,
        },
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
    return { hits: [], total: 0, moreResultsAvailable: false };
  }

  return {
    hits: container.hits,
    total: container.total,
    moreResultsAvailable: container.moreResultsAvailable,
  };
}
