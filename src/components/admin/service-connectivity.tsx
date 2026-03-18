"use client";

import { useState, useCallback } from "react";
import { useAdminToken } from "@/hooks/use-admin-api";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";

interface ServiceCheck {
  name: string;
  description: string;
  permission: string;
  status: "pending" | "checking" | "connected" | "error";
  latencyMs?: number;
  error?: string;
}

const INITIAL_CHECKS: ServiceCheck[] = [
  {
    name: "Microsoft Graph",
    description: "Basic user profile access",
    permission: "User.Read",
    status: "pending",
  },
  {
    name: "Directory Roles",
    description: "Admin role verification",
    permission: "Directory.Read.All",
    status: "pending",
  },
  {
    name: "Organisation Info",
    description: "Tenant name and branding",
    permission: "Directory.Read.All",
    status: "pending",
  },
  {
    name: "SharePoint Search",
    description: "File and document search",
    permission: "Files.Read.All + Sites.Read.All",
    status: "pending",
  },
  {
    name: "SharePoint Sites",
    description: "Site listing and access",
    permission: "Sites.Read.All",
    status: "pending",
  },
  {
    name: "Database",
    description: "Turso/LibSQL connectivity",
    permission: "Server-side",
    status: "pending",
  },
  {
    name: "AI Service",
    description: "Anthropic Claude API",
    permission: "Server-side",
    status: "pending",
  },
];

async function probeEndpoint(
  url: string,
  token: string,
  options?: RequestInit
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options?.headers },
    });
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok) return { ok: true, latencyMs };
    const body = await res.text().catch(() => "");
    return { ok: false, latencyMs, error: `${res.status}: ${body.slice(0, 100)}` };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function ServiceConnectivity() {
  const { getToken } = useAdminToken();
  const [checks, setChecks] = useState<ServiceCheck[]>(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);

  const updateCheck = useCallback(
    (index: number, update: Partial<ServiceCheck>) => {
      setChecks((prev) =>
        prev.map((c, i) => (i === index ? { ...c, ...update } : c))
      );
    },
    []
  );

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: "checking" })));

    let token: string;
    try {
      token = await getToken();
    } catch {
      setChecks(
        INITIAL_CHECKS.map((c) => ({
          ...c,
          status: "error" as const,
          error: "Failed to acquire token",
        }))
      );
      setRunning(false);
      return;
    }

    // Graph API checks (parallel)
    const graphChecks = [
      // 0: User.Read
      probeEndpoint("https://graph.microsoft.com/v1.0/me?$select=id,displayName", token),
      // 1: Directory roles (memberOf)
      probeEndpoint("https://graph.microsoft.com/v1.0/me/memberOf?$top=5", token),
      // 2: Organisation info
      probeEndpoint("https://graph.microsoft.com/v1.0/organization?$select=id,displayName", token),
      // 3: Search API
      probeEndpoint("https://graph.microsoft.com/v1.0/search/query", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ entityTypes: ["driveItem"], query: { queryString: "test" }, from: 0, size: 1 }],
        }),
      }),
      // 4: Sites
      probeEndpoint("https://graph.microsoft.com/v1.0/sites?search=*&$top=1&$select=id", token),
    ];

    const results = await Promise.allSettled(graphChecks);

    // Update Graph checks (indices 0-4)
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const { ok, latencyMs, error } = result.value;
        updateCheck(i, {
          status: ok ? "connected" : "error",
          latencyMs,
          error: ok ? undefined : error,
        });
      } else {
        updateCheck(i, { status: "error", error: "Check failed" });
      }
    });

    // Server-side checks via health endpoint
    try {
      const healthRes = await fetch("/api/health");
      const health = await healthRes.json();

      // 5: Database
      updateCheck(5, {
        status: health.checks?.database === "ok" ? "connected" : "error",
        error: health.checks?.database === "ok" ? undefined : "Database unreachable",
      });

      // 6: AI Service
      updateCheck(6, {
        status: health.checks?.anthropicKey === "ok" ? "connected" : "error",
        error: health.checks?.anthropicKey === "ok" ? undefined : "API key not configured",
      });
    } catch {
      updateCheck(5, { status: "error", error: "Health endpoint unreachable" });
      updateCheck(6, { status: "error", error: "Health endpoint unreachable" });
    }

    setRunning(false);
  }, [getToken, updateCheck]);

  const connectedCount = checks.filter((c) => c.status === "connected").length;
  const errorCount = checks.filter((c) => c.status === "error").length;
  const isPending = checks.every((c) => c.status === "pending");

  return (
    <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#1a2a3a] flex items-center gap-1.5">
          <Wifi className="h-4 w-4 text-[#667781]" />
          Service Connectivity
        </h3>
        <button
          type="button"
          onClick={runChecks}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#d0d8e0] text-[#1a2a3a] hover:bg-[#f8fafb] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          {isPending ? "Run Checks" : "Re-check"}
        </button>
      </div>

      {!isPending && (
        <div className="flex items-center gap-3 mb-3 text-xs">
          {connectedCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {connectedCount} connected
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              {errorCount} failed
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {checks.map((check, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-2 px-3 rounded-md ${
              check.status === "error"
                ? "bg-red-50"
                : check.status === "connected"
                  ? "bg-green-50"
                  : "bg-[#f8fafb]"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                <span className="text-sm text-[#1a2a3a]">{check.name}</span>
                <span className="text-[10px] text-[#9aa5ad] font-mono">{check.permission}</span>
              </div>
              {check.status === "error" && check.error && (
                <p className="text-[10px] text-red-500 mt-0.5 ml-6 truncate">{check.error}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {check.latencyMs !== undefined && check.status === "connected" && (
                <span className="flex items-center gap-0.5 text-[10px] text-[#667781]">
                  <Clock className="h-3 w-3" />
                  {check.latencyMs}ms
                </span>
              )}
              <span
                className={`text-[10px] font-medium ${
                  check.status === "connected"
                    ? "text-green-600"
                    : check.status === "error"
                      ? "text-red-600"
                      : check.status === "checking"
                        ? "text-[#1976d2]"
                        : "text-[#9aa5ad]"
                }`}
              >
                {check.status === "pending"
                  ? "Not checked"
                  : check.status === "checking"
                    ? "Checking..."
                    : check.status === "connected"
                      ? "Connected"
                      : "Failed"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isPending && (
        <p className="text-xs text-[#667781] mt-3 text-center">
          Click &quot;Run Checks&quot; to test connectivity to all services.
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ServiceCheck["status"] }) {
  switch (status) {
    case "connected":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "checking":
      return <Loader2 className="h-4 w-4 text-[#1976d2] animate-spin shrink-0" />;
    default:
      return <WifiOff className="h-4 w-4 text-[#9aa5ad] shrink-0" />;
  }
}
