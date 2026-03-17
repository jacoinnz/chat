"use client";

import { useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import {
  Loader2,
  Building2,
  Shield,
  Activity,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface TenantInfo {
  tenantId: string;
  tenantName: string;
  consentStatus: string;
  configuredAt: string | null;
  lastConfigUpdate: string | null;
  adminRoles: Record<string, number>;
  systemStatus: {
    database: string;
    searchApi: string;
    graphApi: string;
    aiService: string;
  };
  version: {
    app: string;
    schema: string;
  };
}

function StatusDot({ status }: { status: string }) {
  if (status === "operational") {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (status === "error") {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  if (status === "not_configured") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <div className="h-4 w-4 rounded-full bg-gray-300" />;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    operational: "Operational",
    error: "Error",
    not_configured: "Not Configured",
    unknown: "Unknown",
  };
  return labels[status] || status;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TenantSettingsPage() {
  const { instance } = useMsal();
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    try {
      const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
      if (!account) return;

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: graphScopes.admin,
        account,
      });

      const response = await fetch("/api/admin/tenant-info", {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      if (response.ok) {
        setInfo(await response.json());
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [instance]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="bg-white rounded-lg border border-[#d0d8e0] p-8 text-center">
        <p className="text-sm text-[#667781]">Failed to load tenant information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-lg font-semibold text-[#1a2a3a]">Tenant Settings</h2>

      {/* Tenant Information */}
      <div className="bg-white rounded-lg border border-[#d0d8e0] p-5">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-4 flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-[#667781]" />
          Tenant Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Organisation Name" value={info.tenantName || "Not available"} />
          <InfoRow label="Tenant ID" value={info.tenantId} mono />
          <InfoRow
            label="Consent Status"
            value={info.consentStatus === "granted" ? "Admin consent granted" : "Unknown"}
            status={info.consentStatus === "granted" ? "good" : "neutral"}
          />
          <InfoRow label="First Configured" value={formatDate(info.configuredAt)} />
          <InfoRow label="Last Config Update" value={formatDate(info.lastConfigUpdate)} />
        </div>
      </div>

      {/* Access Control */}
      <div className="bg-white rounded-lg border border-[#d0d8e0] p-5">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-4 flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-[#667781]" />
          Access Control
        </h3>
        <p className="text-xs text-[#667781] mb-3">
          Detected admin roles with access to this portal:
        </p>
        <div className="space-y-2">
          {Object.entries(info.adminRoles).length > 0 ? (
            Object.entries(info.adminRoles).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-2 px-3 bg-[#f8fafb] rounded-md">
                <span className="text-sm text-[#1a2a3a]">{role}s</span>
                <span className="text-sm font-semibold text-[#1976d2]">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#667781]">Unable to retrieve role counts. Ensure Directory.Read.All permission is granted.</p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-[#e8eef4]">
          <p className="text-xs text-[#667781]">
            Access is restricted to users with <strong>Global Administrator</strong> or <strong>SharePoint Administrator</strong> directory roles, verified via Microsoft Graph API.
          </p>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg border border-[#d0d8e0] p-5">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-4 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-[#667781]" />
          System Status
        </h3>
        <div className="space-y-2.5">
          <StatusRow label="Microsoft Graph" status={info.systemStatus.graphApi} />
          <StatusRow label="Search API" status={info.systemStatus.searchApi} />
          <StatusRow label="AI Service" status={info.systemStatus.aiService} />
          <StatusRow label="Database" status={info.systemStatus.database} />
        </div>
      </div>

      {/* Version Information */}
      <div className="bg-white rounded-lg border border-[#d0d8e0] p-5">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-4 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-[#667781]" />
          Version Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoRow label="App Version" value={info.version.app} />
          <InfoRow label="Schema Version" value={info.version.schema} />
          <InfoRow label="Last Update" value={formatDate(info.lastConfigUpdate)} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: "good" | "bad" | "neutral";
}) {
  return (
    <div>
      <p className="text-xs text-[#667781] mb-0.5">{label}</p>
      <p
        className={`text-sm ${
          status === "good"
            ? "text-green-600 font-medium"
            : status === "bad"
              ? "text-red-600 font-medium"
              : "text-[#1a2a3a]"
        } ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-[#f8fafb] rounded-md">
      <span className="text-sm text-[#1a2a3a]">{label}</span>
      <div className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className={`text-xs font-medium ${
          status === "operational" ? "text-green-600" :
          status === "error" ? "text-red-600" :
          status === "not_configured" ? "text-amber-600" :
          "text-[#667781]"
        }`}>
          {statusLabel(status)}
        </span>
      </div>
    </div>
  );
}
