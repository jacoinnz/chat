"use client";

import { RefreshCw } from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "critical";
  latencyMs: number;
  message: string;
}

interface HealthData {
  overall: "healthy" | "degraded" | "critical";
  services: ServiceCheck[];
  checkedAt: string;
}

const STATUS_STYLES = {
  healthy: { bg: "bg-green-500", text: "text-green-700", label: "Healthy", ring: "ring-green-200" },
  degraded: { bg: "bg-amber-500", text: "text-amber-700", label: "Degraded", ring: "ring-amber-200" },
  critical: { bg: "bg-red-500", text: "text-red-700", label: "Critical", ring: "ring-red-200" },
};

export default function SystemHealthPage() {
  const { data, loading, refetch } = useAdminFetch<HealthData>("/api/admin/health");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0d3b66]">System Health</h1>
          {data?.checkedAt && (
            <p className="text-xs text-[#667781] mt-1">
              Last checked: {new Date(data.checkedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          onClick={() => refetch()}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Run Check
        </Button>
      </div>

      {loading && !data && (
        <SectionCard title="Checking services...">
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1976d2]" />
            <span className="text-sm text-[#667781]">Running health checks...</span>
          </div>
        </SectionCard>
      )}

      {data && (
        <>
          {/* Overall Status */}
          <SectionCard title="Overall Status">
            <div className="flex items-center gap-4 py-2">
              <div
                className={`w-12 h-12 rounded-full ${STATUS_STYLES[data.overall].bg} ring-4 ${STATUS_STYLES[data.overall].ring} flex items-center justify-center`}
              >
                <span className="text-white text-lg font-bold">
                  {data.overall === "healthy" ? "✓" : data.overall === "degraded" ? "!" : "✕"}
                </span>
              </div>
              <div>
                <p className={`text-lg font-semibold ${STATUS_STYLES[data.overall].text}`}>
                  {STATUS_STYLES[data.overall].label}
                </p>
                <p className="text-xs text-[#667781]">
                  {data.services.filter((s) => s.status === "healthy").length} of {data.services.length} services healthy
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Service Cards */}
          <SectionCard title="Service Connectivity">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.services.map((service) => {
                const style = STATUS_STYLES[service.status];
                return (
                  <div
                    key={service.name}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#d0d8e0] bg-white"
                  >
                    <div className={`w-3 h-3 rounded-full ${style.bg} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#1a2a3a]">{service.name}</span>
                        <span className="text-[10px] text-[#667781]">{service.latencyMs}ms</span>
                      </div>
                      <p className={`text-xs ${style.text}`}>{service.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Latency Metrics */}
          <SectionCard title="Latency Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.services.map((service) => (
                <div key={service.name} className="text-center p-3 rounded-lg bg-[#f0f2f5]">
                  <p className="text-2xl font-bold text-[#0d3b66]">{service.latencyMs}</p>
                  <p className="text-[10px] text-[#667781] uppercase tracking-wider mt-1">
                    {service.name} (ms)
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
