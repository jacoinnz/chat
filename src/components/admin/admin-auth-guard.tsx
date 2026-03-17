"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import { ShieldAlert, Loader2 } from "lucide-react";

interface AdminAuthGuardProps {
  children: ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { instance } = useMsal();
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      try {
        const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
        if (!account) {
          setStatus("denied");
          return;
        }

        // Acquire token with Directory.Read.All scope
        let tokenResponse;
        try {
          tokenResponse = await instance.acquireTokenSilent({
            scopes: graphScopes.admin,
            account,
          });
        } catch {
          tokenResponse = await instance.acquireTokenPopup({
            scopes: graphScopes.admin,
          });
        }

        // Check admin role via Graph API
        const response = await fetch(
          "https://graph.microsoft.com/v1.0/me/memberOf",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          if (!cancelled) setStatus("denied");
          return;
        }

        const data = await response.json();
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

        if (!cancelled) setStatus(isAdmin ? "authorized" : "denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    }

    checkAdmin();
    return () => { cancelled = true; };
  }, [instance]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#e8eef4]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1976d2]" />
          <p className="text-sm text-[#667781]">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#e8eef4]">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1a2a3a] mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-[#667781] mb-6">
            You need Global Administrator or SharePoint Administrator role to
            access the admin portal.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1976d2] text-white rounded-md text-sm hover:bg-[#1565c0] transition-colors"
          >
            Back to Chat
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
