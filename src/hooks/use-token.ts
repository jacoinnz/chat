"use client";

import { useCallback, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

/**
 * Robust token acquisition hook with automatic fallback.
 * 1. Tries acquireTokenSilent (uses cached/refreshed token)
 * 2. Falls back to acquireTokenRedirect on InteractionRequiredAuthError
 * 3. Deduplicates concurrent requests to avoid multiple redirects
 */
export function useTokenAcquisition(scopes: string[]) {
  const { instance } = useMsal();
  const pendingRef = useRef<Promise<string> | null>(null);

  const getToken = useCallback(async (): Promise<string> => {
    // Deduplicate concurrent token requests
    if (pendingRef.current) return pendingRef.current;

    const acquire = async (): Promise<string> => {
      const account =
        instance.getActiveAccount() ?? instance.getAllAccounts()[0];
      if (!account) throw new Error("No account — user must sign in");

      try {
        // Primary: silent acquisition (uses refresh token if access token expired)
        const response = await instance.acquireTokenSilent({
          scopes,
          account,
          forceRefresh: false,
        });
        return response.accessToken;
      } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
          // Fallback: redirect for consent/re-auth
          await instance.acquireTokenRedirect({
            scopes,
            account,
          });
          // Page will redirect — return empty string (never reached)
          return "";
        }
        throw err;
      }
    };

    pendingRef.current = acquire().finally(() => {
      pendingRef.current = null;
    });

    return pendingRef.current;
  }, [instance, scopes]);

  return { getToken };
}
