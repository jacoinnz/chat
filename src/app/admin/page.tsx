"use client";

import { useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import { StatCard } from "@/components/admin/stat-card";
import { DailyChart } from "@/components/admin/daily-chart";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  period: string;
  searchCount: number;
  chatCount: number;
  errorCount: number;
  errorRate: string;
  activeUsers: number;
  daily: Array<{ date: string; search: number; chat: number; error: number }>;
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Dashboard</h2>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Searches" value={data.searchCount} />
            <StatCard label="Chat Sessions" value={data.chatCount} />
            <StatCard label="Error Rate" value={`${data.errorRate}%`} />
            <StatCard label="Active Users" value={data.activeUsers} />
          </div>
          <DailyChart data={data.daily} />
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
