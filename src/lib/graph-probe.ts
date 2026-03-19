const GRAPH_SEARCH_ENDPOINT = "https://graph.microsoft.com/v1.0/search/query";

/**
 * Test whether a SharePoint managed property exists and has data in the tenant.
 * Runs a minimal Graph Search query with `Property:*` (matches any non-empty value).
 *
 * Returns true if at least one document has a value for this property.
 * Returns false if the property doesn't exist, has no data, or the query fails.
 *
 * This is the right heuristic for safety toggle defaults: if no documents have
 * a Status value, enabling approvedOnly would produce zero results — so we
 * leave it off. If documents DO have Status values, it's safe to enable.
 */
export async function testKqlProperty(
  property: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(GRAPH_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            entityTypes: ["driveItem"],
            query: { queryString: `${property}:*` },
            fields: [property],
            from: 0,
            size: 1,
          },
        ],
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const hits = data.value?.[0]?.hitsContainers?.[0]?.hits;
    return Array.isArray(hits) && hits.length > 0;
  } catch {
    return false;
  }
}

/**
 * Probe the tenant's SharePoint search schema for Status and Sensitivity
 * managed properties. Returns recommended safety toggle defaults.
 */
export async function detectSafetyProperties(
  token: string
): Promise<{ hasStatus: boolean; hasSensitivity: boolean }> {
  const [hasStatus, hasSensitivity] = await Promise.all([
    testKqlProperty("Status", token),
    testKqlProperty("Sensitivity", token),
  ]);
  return { hasStatus, hasSensitivity };
}

/**
 * Validate multiple SharePoint managed properties against the tenant's
 * search schema. Returns a map of property name → found (true/false).
 */
export async function validateProperties(
  properties: string[],
  token: string
): Promise<Record<string, boolean>> {
  const unique = [...new Set(properties)];
  const results = await Promise.all(
    unique.map(async (prop) => [prop, await testKqlProperty(prop, token)] as const)
  );
  return Object.fromEntries(results);
}
