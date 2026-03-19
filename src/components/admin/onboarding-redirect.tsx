"use client";

import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { graphScopes } from "@/lib/msal-config";
import { useTenantConfig } from "@/components/providers/tenant-config-provider";

/**
 * Silently checks if the current user is an admin with no tenant config.
 * If so, redirects to /onboarding. Renders nothing — completely transparent
 * for non-admin users and tenants that already have config.
 *
 * Uses sessionStorage to prevent redirect loops: if a non-admin gets sent
 * to /onboarding and comes back (denied), they won't be redirected again.
 */
export function OnboardingRedirect() {
  const { configExists, isLoading } = useTenantConfig();
  const { instance } = useMsal();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading || configExists || checked) return;

    // Prevent redirect loops within the same session
    if (sessionStorage.getItem("onboarding_redirect_done")) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    async function checkAdminAndRedirect() {
      try {
        const account =
          instance.getActiveAccount() ?? instance.getAllAccounts()[0];
        if (!account) return;

        // Try to silently acquire admin-scoped token — if user hasn't
        // consented to Directory.Read.All, this fails silently
        let token: string;
        try {
          const response = await instance.acquireTokenSilent({
            scopes: graphScopes.admin,
            account,
            forceRefresh: false,
          });
          token = response.accessToken;
        } catch (err) {
          if (err instanceof InteractionRequiredAuthError) {
            // User hasn't consented to admin scopes — not an admin flow
            return;
          }
          return;
        }

        // Check admin role via Graph API
        const memberOfRes = await fetch(
          "https://graph.microsoft.com/v1.0/me/memberOf",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!memberOfRes.ok) return;

        const data = await memberOfRes.json();
        const adminRoleIds = [
          "62e90394-69f5-4237-9190-012177145e10", // Global Administrator
          "f28a1f94-e044-4c59-956a-681e95fa6d63", // SharePoint Administrator
        ];
        const isAdmin = (data.value || []).some(
          (role: { "@odata.type": string; roleTemplateId?: string }) =>
            role["@odata.type"] === "#microsoft.graph.directoryRole" &&
            role.roleTemplateId &&
            adminRoleIds.includes(role.roleTemplateId)
        );

        if (isAdmin && !cancelled) {
          sessionStorage.setItem("onboarding_redirect_done", "1");
          window.location.href = "/onboarding";
        }
      } catch {
        // Any failure — silently skip redirect
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    checkAdminAndRedirect();
    return () => {
      cancelled = true;
    };
  }, [isLoading, configExists, checked, instance]);

  return null;
}
