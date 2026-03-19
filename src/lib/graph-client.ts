import type { IPublicClientApplication, AccountInfo } from "@azure/msal-browser";

interface GraphClientOptions {
  scopes?: string[];
  maxRateLimitRetries?: number;
}

export class GraphClient {
  private scopes: string[] | undefined;
  private maxRateLimitRetries: number;
  private cachedToken: string | null = null;
  private msal: IPublicClientApplication | null = null;

  constructor(options?: GraphClientOptions) {
    this.scopes = options?.scopes;
    this.maxRateLimitRetries = options?.maxRateLimitRetries ?? 3;
  }

  /** Lazy-load the MSAL singleton — only runs in the browser, never during SSR. */
  private async getMsal(): Promise<IPublicClientApplication> {
    if (!this.msal) {
      const { msalInstance } = await import(
        "@/components/providers/msal-provider"
      );
      this.msal = msalInstance;
    }
    return this.msal;
  }

  /** Lazy-load scopes from msal-config. */
  private async getScopes(): Promise<string[]> {
    if (this.scopes) return this.scopes;
    const { graphScopes } = await import("./msal-config");
    return graphScopes.search;
  }

  /** Active MSAL account (or first available). Throws if none. */
  async getAccount(): Promise<AccountInfo> {
    const msal = await this.getMsal();
    let account = msal.getActiveAccount();
    if (!account) {
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        msal.setActiveAccount(accounts[0]);
        account = accounts[0];
      } else {
        throw new Error("No active account. Please sign in first.");
      }
    }
    return account;
  }

  /** Derive SharePoint root URL from account username.
   *  e.g. user@contoso.onmicrosoft.com → https://contoso.sharepoint.com */
  async getSharePointRoot(): Promise<string | undefined> {
    try {
      const acct = await this.getAccount();
      if (!acct.username) return undefined;
      const domain = acct.username.split("@")[1];
      if (!domain) return undefined;
      const tenant = domain.replace(".onmicrosoft.com", "").split(".")[0];
      return `https://${tenant}.sharepoint.com`;
    } catch {
      return undefined;
    }
  }

  /** Get an access token (for non-Graph calls like internal API routes). */
  async getToken(): Promise<string> {
    return this.cachedToken ?? this.acquireToken();
  }

  private async acquireToken(forceRefresh = false): Promise<string> {
    const msal = await this.getMsal();
    const account = await this.getAccount();
    const scopes = await this.getScopes();
    try {
      const response = await msal.acquireTokenSilent({
        scopes,
        account,
        forceRefresh,
      });
      this.cachedToken = response.accessToken;
      return response.accessToken;
    } catch (err) {
      const { InteractionRequiredAuthError } = await import(
        "@azure/msal-browser"
      );
      if (err instanceof InteractionRequiredAuthError) {
        await msal.acquireTokenRedirect({ scopes, account });
        return "";
      }
      throw err;
    }
  }

  /**
   * Authenticated request to Microsoft Graph.
   * - Injects Bearer token
   * - Retries once on 401 (force-refreshes token)
   * - Backs off on 429 (respects Retry-After, else exponential)
   */
  async request(url: string, init?: RequestInit): Promise<Response> {
    let token = this.cachedToken ?? (await this.acquireToken());

    const execute = (accessToken: string): Promise<Response> => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch(url, { ...init, headers });
    };

    let response = await execute(token);

    // 401: token expired — force refresh and retry once
    if (response.status === 401) {
      token = await this.acquireToken(true);
      response = await execute(token);
    }

    // 429: rate limited — backoff and retry
    let rateLimitRetries = 0;
    while (
      response.status === 429 &&
      rateLimitRetries < this.maxRateLimitRetries
    ) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : 1000 * Math.pow(2, rateLimitRetries);
      await sleep(waitMs);
      rateLimitRetries++;
      response = await execute(token);
    }

    return response;
  }

  /** GET request. */
  async get(
    url: string,
    init?: Omit<RequestInit, "method" | "body">
  ): Promise<Response> {
    return this.request(url, { ...init, method: "GET" });
  }

  /** POST request with JSON body. */
  async post(
    url: string,
    body: unknown,
    init?: Omit<RequestInit, "method" | "body">
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return this.request(url, {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
