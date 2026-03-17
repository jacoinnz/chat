"use client";

import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface HealthData {
  graphErrors: number;
  authErrors: number;
  noResultRate: string;
  hasZeroResultSpike: boolean;
  hasMissingPropertyMapping: boolean;
  status: "healthy" | "warning" | "degraded";
}

const STATUS_CONFIG = {
  healthy: {
    icon: ShieldCheck,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    label: "Healthy",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    label: "Warning",
  },
  degraded: {
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    label: "Degraded",
  },
};

export function HealthIndicator({ health }: { health: HealthData }) {
  const config = STATUS_CONFIG[health.status] || STATUS_CONFIG.healthy;
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <h3 className={`text-sm font-semibold ${config.color}`}>
          Tenant Health: {config.label}
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <HealthMetric
          label="Graph API Errors"
          value={health.graphErrors}
          warn={health.graphErrors > 0}
        />
        <HealthMetric
          label="Auth Errors"
          value={health.authErrors}
          warn={health.authErrors > 0}
        />
        <HealthMetric
          label="No-Result Rate"
          value={`${health.noResultRate}%`}
          warn={parseFloat(health.noResultRate) > 20}
        />
        <HealthMetric
          label="Zero-Result Spike"
          value={health.hasZeroResultSpike ? "Detected" : "None"}
          warn={health.hasZeroResultSpike}
        />
        <HealthMetric
          label="Property Mapping"
          value={health.hasMissingPropertyMapping ? "Using defaults" : "Configured"}
          warn={health.hasMissingPropertyMapping}
        />
      </div>

      {health.status !== "healthy" && (
        <div className="mt-3 text-xs text-[#667781] border-t border-[#d0d8e0] pt-2 space-y-1">
          {health.graphErrors > 5 && (
            <p>Graph API failures may indicate missing permissions or service issues.</p>
          )}
          {health.authErrors > 5 && (
            <p>Auth errors may indicate expired tokens or misconfigured Azure AD permissions.</p>
          )}
          {health.hasZeroResultSpike && (
            <p>No-result spike detected — check KQL property mappings or SharePoint site column configuration.</p>
          )}
          {health.hasMissingPropertyMapping && (
            <p>KQL properties are using generic defaults. Map them to your SharePoint managed properties in KQL Mapping.</p>
          )}
        </div>
      )}
    </div>
  );
}

function HealthMetric({ label, value, warn }: { label: string; value: string | number; warn: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#667781]">{label}</span>
      <span className={`text-xs font-medium ${warn ? "text-red-600" : "text-[#1a2a3a]"}`}>
        {value}
      </span>
    </div>
  );
}
