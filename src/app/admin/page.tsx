"use client";

import { useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import { StatCard } from "@/components/admin/stat-card";
import { DailyChart } from "@/components/admin/daily-chart";
import { HealthIndicator } from "@/components/admin/health-indicator";
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Search,
  MessageSquare,
  Users,
  BarChart3,
  ShieldAlert,
  History,
} from "lucide-react";

interface UsageSummary {
  searches: { today: number; "7d": number; "30d": number };
  aiAnswers: { today: number; "7d": number; "30d": number };
  activeUsers: { today: number; "7d": number; "30d": number };
}

interface Alert {
  severity: "critical" | "warning" | "info";
  message: string;
}

interface AuditEntry {
  action: string;
  section: string;
  details: string | null;
  userHash: string;
  createdAt: string;
}

interface ErrorMonitoring {
  graphApiFailures: { period: number; last24h: number };
  authErrors: { period: number; last24h: number };
  aiFailures: { period: number; last24h: number };
  totalErrors24h: number;
  errorRate24h: string;
}

interface AnalyticsData {
  period: string;
  searchCount: number;
  chatCount: number;
  errorCount: number;
  errorRate: string;
  activeUsers: number;
  noResultCount: number;
  avgResultsPerQuery: string;
  usageSummary: UsageSummary;
  daily: Array<{ date: string; search: number; chat: number; error: number; noResults: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  topFilters: Array<{ filter: string; count: number }>;
  topIntents: Array<{ intent: string; count: number; percentage: string }>;
  health: {
    graphErrors: number;
    authErrors: number;
    noResultRate: string;
    hasZeroResultSpike: boolean;
    hasMissingPropertyMapping: boolean;
    status: "healthy" | "warning" | "degraded";
  };
  alerts: Alert[];
  errorMonitoring: ErrorMonitoring;
  recentChanges: AuditEntry[];
}

const ALERT_STYLES = {
  critical: { icon: AlertCircle, bg: "bg-red-50 border-red-200", text: "text-red-700" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  info: { icon: Info, bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
};

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sectionLabel(section: string): string {
  const labels: Record<string, string> = {
    taxonomy: "Taxonomy",
    "content-types": "Content Types",
    keywords: "Keywords",
    "review-policies": "Review Policies",
    "search-behaviour": "Search Behaviour",
    "kql-map": "KQL Mapping",
    "search-fields": "Search Fields",
    config: "Full Config",
  };
  return labels[section] || section;
}

export default function AdminDashboard() {
  const { instance } = useMsal();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
      if (!account) return;

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: graphScopes.admin,
        account,
      });

      const response = await fetch(`/api/admin/analytics?period=${p}`, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      if (response.ok) {
        setData(await response.json());
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [instance]);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Tenant Overview</h2>
        <div className="flex items-center gap-1 bg-white border border-[#d0d8e0] rounded-md p-0.5">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p
                  ? "bg-[#1976d2] text-white"
                  : "text-[#667781] hover:text-[#1a2a3a]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
        </div>
      ) : data ? (
        <>
          {/* Alerts & Issues */}
          {data.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[#1a2a3a] flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Alerts & Issues
              </h3>
              {data.alerts.map((alert, i) => {
                const style = ALERT_STYLES[alert.severity];
                const Icon = style.icon;
                return (
                  <div key={i} className={`rounded-lg border p-3 flex items-start gap-2 ${style.bg}`}>
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
                    <p className={`text-xs ${style.text}`}>{alert.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tenant Health */}
          <HealthIndicator health={data.health} />

          {/* Usage Summary — multi-period panels */}
          <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
            <h3 className="text-sm font-medium text-[#1a2a3a] mb-4">Usage Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Searches */}
              <SummaryPanel
                icon={<Search className="h-4 w-4 text-[#1976d2]" />}
                label="Searches"
                today={data.usageSummary.searches.today}
                week={data.usageSummary.searches["7d"]}
                month={data.usageSummary.searches["30d"]}
              />
              {/* AI Answers */}
              <SummaryPanel
                icon={<MessageSquare className="h-4 w-4 text-[#4fc3f7]" />}
                label="AI Answers"
                today={data.usageSummary.aiAnswers.today}
                week={data.usageSummary.aiAnswers["7d"]}
                month={data.usageSummary.aiAnswers["30d"]}
              />
              {/* Active Users */}
              <SummaryPanel
                icon={<Users className="h-4 w-4 text-[#66bb6a]" />}
                label="Active Users"
                today={data.usageSummary.activeUsers.today}
                week={data.usageSummary.activeUsers["7d"]}
                month={data.usageSummary.activeUsers["30d"]}
              />
              {/* Avg Results */}
              <div className="border border-[#e8eef4] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="h-4 w-4 text-[#ab47bc]" />
                  <span className="text-xs font-medium text-[#1a2a3a]">Avg Results / Query</span>
                </div>
                <p className="text-2xl font-semibold text-[#1a2a3a]">{data.avgResultsPerQuery}</p>
                <p className="text-[10px] text-[#667781] mt-1">
                  {data.noResultCount} zero-result quer{data.noResultCount === 1 ? "y" : "ies"} ({data.health.noResultRate}%)
                </p>
              </div>
            </div>
          </div>

          {/* Core Metrics (selected period) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Searches" value={data.searchCount} trend={`${period} period`} />
            <StatCard label="AI Conversations" value={data.chatCount} trend={`${period} period`} />
            <StatCard label="Error Rate" value={`${data.errorRate}%`} trend={`${data.errorCount} errors`} />
            <StatCard label="Active Users" value={data.activeUsers} trend={`${period} period`} />
          </div>

          {/* Usage Trends — Daily Chart */}
          <DailyChart data={data.daily} />

          {/* Query Insights + Peak Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Query Intents (with percentages) */}
            <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
              <h3 className="text-sm font-medium text-[#1a2a3a] mb-3">Query Insights</h3>
              {data.topIntents.length > 0 ? (
                <div className="space-y-2.5">
                  {data.topIntents.map((i) => (
                    <div key={i.intent}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#667781] capitalize">{i.intent} search</span>
                        <span className="text-xs font-medium text-[#1a2a3a]">{i.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#e8eef4] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4fc3f7] rounded-full transition-all"
                          style={{ width: `${Math.max(4, parseInt(i.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#667781]">No intent data yet.</p>
              )}
            </div>

            {/* Peak Hours */}
            <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
              <h3 className="text-sm font-medium text-[#1a2a3a] mb-3 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#667781]" />
                Peak Usage Hours
              </h3>
              {data.peakHours.length > 0 ? (
                <div className="space-y-2">
                  {data.peakHours.map((ph) => (
                    <div key={ph.hour} className="flex items-center justify-between">
                      <span className="text-xs text-[#667781] w-16">{formatHour(ph.hour)}</span>
                      <div className="flex-1 mx-2">
                        <div className="w-full h-2 bg-[#e8eef4] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1976d2] rounded-full"
                            style={{
                              width: `${Math.min(100, (ph.count / (data.peakHours[0]?.count || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#1a2a3a] w-10 text-right">
                        {ph.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#667781]">No usage data yet.</p>
              )}
            </div>
          </div>

          {/* Error Monitoring + Most Used Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Error Monitoring */}
            <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
              <h3 className="text-sm font-medium text-[#1a2a3a] mb-3 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-[#667781]" />
                Error Monitoring
              </h3>
              <div className="space-y-2">
                <ErrorRow
                  label="Graph API Failures"
                  period={data.errorMonitoring.graphApiFailures.period}
                  last24h={data.errorMonitoring.graphApiFailures.last24h}
                  periodLabel={period}
                />
                <ErrorRow
                  label="Auth Errors"
                  period={data.errorMonitoring.authErrors.period}
                  last24h={data.errorMonitoring.authErrors.last24h}
                  periodLabel={period}
                />
                <ErrorRow
                  label="AI Failures"
                  period={data.errorMonitoring.aiFailures.period}
                  last24h={data.errorMonitoring.aiFailures.last24h}
                  periodLabel={period}
                />
                <div className="pt-2 mt-2 border-t border-[#e8eef4] flex items-center justify-between">
                  <span className="text-xs text-[#667781]">Error rate (24h)</span>
                  <span className={`text-xs font-medium ${
                    parseFloat(data.errorMonitoring.errorRate24h) > 5 ? "text-red-600" : "text-[#1a2a3a]"
                  }`}>
                    {data.errorMonitoring.errorRate24h}%
                  </span>
                </div>
              </div>
            </div>

            {/* Most Used Filters */}
            <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
              <h3 className="text-sm font-medium text-[#1a2a3a] mb-3">Most Used Filters</h3>
              {data.topFilters.length > 0 ? (
                <div className="space-y-2">
                  {data.topFilters.map((f) => (
                    <div key={f.filter} className="flex items-center justify-between">
                      <span className="text-xs text-[#667781] capitalize">{f.filter}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[#e8eef4] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1976d2] rounded-full"
                            style={{
                              width: `${Math.min(100, (f.count / (data.topFilters[0]?.count || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[#1a2a3a] w-8 text-right">{f.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#667781]">No filter usage data yet.</p>
              )}
            </div>
          </div>

          {/* Recent Admin Changes (Audit Log) */}
          <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
            <h3 className="text-sm font-medium text-[#1a2a3a] mb-3 flex items-center gap-1.5">
              <History className="h-4 w-4 text-[#667781]" />
              Recent Admin Changes
            </h3>
            {data.recentChanges.length > 0 ? (
              <div className="space-y-0">
                {data.recentChanges.slice(0, 10).map((entry, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 py-2.5 ${
                      i < data.recentChanges.length - 1 && i < 9 ? "border-b border-[#e8eef4]" : ""
                    }`}
                  >
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      entry.action === "reset" ? "bg-amber-400" : "bg-[#1976d2]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#1a2a3a]">
                          {sectionLabel(entry.section)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          entry.action === "reset"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {entry.action}
                        </span>
                      </div>
                      {entry.details && (
                        <p className="text-xs text-[#667781] mt-0.5 truncate">{entry.details}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-[#667781]">{formatTimeAgo(entry.createdAt)}</p>
                      <p className="text-[10px] text-[#9aa5ad]">admin {entry.userHash}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#667781]">No admin changes recorded yet.</p>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-[#d0d8e0] p-8 text-center">
          <p className="text-sm text-[#667781]">
            No analytics data available yet. Usage will be tracked as users interact with the chat.
          </p>
        </div>
      )}
    </div>
  );
}

/** Multi-period summary panel (today / 7d / 30d). */
function SummaryPanel({
  icon,
  label,
  today,
  week,
  month,
}: {
  icon: React.ReactNode;
  label: string;
  today: number;
  week: number;
  month: number;
}) {
  return (
    <div className="border border-[#e8eef4] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs font-medium text-[#1a2a3a]">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-lg font-semibold text-[#1a2a3a]">{today}</p>
          <p className="text-[10px] text-[#667781]">Today</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1a2a3a]">{week}</p>
          <p className="text-[10px] text-[#667781]">7 days</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1a2a3a]">{month}</p>
          <p className="text-[10px] text-[#667781]">30 days</p>
        </div>
      </div>
    </div>
  );
}

/** Error monitoring row with period + last 24h. */
function ErrorRow({
  label,
  period,
  last24h,
  periodLabel,
}: {
  label: string;
  period: number;
  last24h: number;
  periodLabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#667781]">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-xs ${last24h > 0 ? "text-red-600 font-medium" : "text-[#1a2a3a]"}`}>
          {last24h} <span className="text-[#9aa5ad] font-normal">24h</span>
        </span>
        <span className="text-xs text-[#1a2a3a]">
          {period} <span className="text-[#9aa5ad]">{periodLabel}</span>
        </span>
      </div>
    </div>
  );
}
