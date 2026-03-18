import type { SearchHit } from "@/types/search";
import type { RankingContext } from "@/lib/ranking";

/** Create a SearchHit with sensible defaults. */
export function makeHit(overrides: Partial<SearchHit> & { resource?: Partial<SearchHit["resource"]> } = {}): SearchHit {
  const { resource: resourceOverrides, ...rest } = overrides;
  return {
    hitId: "hit-1",
    rank: 1,
    summary: "Test document summary",
    resource: {
      "@odata.type": "#microsoft.graph.driveItem",
      name: "test-doc.docx",
      webUrl: "https://tenant.sharepoint.com/sites/docs/test-doc.docx",
      createdDateTime: "2025-01-01T00:00:00Z",
      lastModifiedDateTime: new Date().toISOString(),
      size: 15000,
      ...resourceOverrides,
    },
    ...rest,
  };
}

/** Create a RankingContext with sensible defaults. */
export function makeContext(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    query: "test query",
    intent: "keyword",
    filters: {},
    sortByRecency: false,
    ...overrides,
  };
}

/** Create a minimal base64url-encoded JWT (no cryptographic signing). */
export function makeJwt(payload: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      tid: "tenant-123",
      oid: "user-456",
      ...payload,
    })
  ).toString("base64url");
  const signature = "fakesig";
  return `${header}.${body}.${signature}`;
}

/** Create a Request with standard tenant/user headers. */
export function makeRequest(
  url = "http://localhost:3000/api/test",
  options: RequestInit & { tenantId?: string; userId?: string; userName?: string; token?: string } = {}
): Request {
  const { tenantId = "tenant-123", userId = "user-456", userName = "Test User", token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("x-tenant-id", tenantId);
  headers.set("x-user-id", userId);
  headers.set("x-user-name", userName);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request(url, { ...init, headers });
}
