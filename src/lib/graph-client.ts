import {
  type IPublicClientApplication,
  type AccountInfo,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { graphScopes } from "./msal-config";

interface GraphClientOptions {
  scopes?: string[];
  maxRateLimitRetries?: number;
}

export class GraphClient {
  private msalInstance: IPublicClientApplication;
  private scopes: string[];
  private maxRateLimitRetries: number;
  private cachedToken: string | null = null;

  constructor(
    msalInstance: IPublicClientApplication,
    options?: GraphClientOptions
  ) {
    this.msalInstance = msalInstance;
    this.scopes = options?.scopes ?? graphScopes.search;
    this.maxRateLimitRetries = options?.maxRateLimitRetries ?? 3;
  }

  /** Active MSAL account (or first available). Throws if none. */
  get account(): AccountInfo {
    let account = this.msalInstance.getActiveAccount();
    if (!account) {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        this.msalInstance.setActiveAccount(accounts[0]);
        account = accounts[0];
      } else {
        throw new Error("No active account. Please sign in first.");
      }
    }
    return account;
  }

  /** Derive SharePoint root URL from account username.
   *  e.g. user@contoso.onmicrosoft.com → https://contoso.sharepoint.com */
  getSharePointRoot(): string | undefined {
    try {
      const acct = this.account;
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
    const account = this.account;
    try {
      const response = await this.msalInstance.acquireTokenSilent({
        scopes: this.scopes,
        account,
        forceRefresh,
      });
      this.cachedToken = response.accessToken;
      return response.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        await this.msalInstance.acquireTokenRedirect({
          scopes: this.scopes,
          account,
        });
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
