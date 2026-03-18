"use client";

import { useState, useCallback, useEffect } from "react";
import { useAdminToken } from "@/hooks/use-admin-api";
import { useToast } from "@/components/ui/toast";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Download,
} from "lucide-react";

interface AuditEntry {
  id: string;
  tenantId: string;
  userHash: string;
  action: string;
  section: string;
  details: string | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SECTIONS = [
  "taxonomy",
  "content-types",
  "keywords",
  "review-policies",
  "search-behaviour",
  "kql-map",
  "search-fields",
  "config",
  "roles",
  "feature-flags",
  "rollback",
];

const ACTIONS = ["update", "reset"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sectionLabel(s: string) {
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AuditLogsPage() {
  const { getToken } = useAdminToken();
  const toasts = useToast();

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [action, setAction] = useState("");
  const [section, setSection] = useState("");
  const [userHash, setUserHash] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const token = await getToken();
        const params = new URLSearchParams({ page: String(p), pageSize: "25" });
        if (action) params.set("action", action);
        if (section) params.set("section", section);
        if (userHash) params.set("userHash", userHash);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const res = await fetch(`/api/admin/audit-logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          toasts.error("Failed to load audit logs");
        }
      } catch {
        toasts.error("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [getToken, action, section, userHash, fromDate, toDate, toasts]
  );

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const applyFilters = () => {
    setPage(1);
    fetchLogs(1);
  };

  const clearFilters = () => {
    setAction("");
    setSection("");
    setUserHash("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasFilters = action || section || userHash || fromDate || toDate;

  const exportCSV = useCallback(() => {
    if (!data?.logs.length) return;
    const header = "Date,Action,Section,Details,User Hash";
    const rows = data.logs.map(
      (l) =>
        `"${formatDate(l.createdAt)}","${l.action}","${l.section}","${(l.details ?? "").replace(/"/g, '""')}","${l.userHash.slice(0, 8)}..."`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toasts.success("Exported audit logs");
  }, [data, toasts]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0d3b66] flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Logs
          </h1>
          <p className="text-sm text-[#667781] mt-0.5">
            Track all admin configuration changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={!data?.logs.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#d0d8e0] rounded-lg hover:bg-white disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg ${
              showFilters || hasFilters
                ? "border-[#1976d2] text-[#1976d2] bg-blue-50"
                : "border-[#d0d8e0] hover:bg-white"
            }`}
          >
            <Filter size={14} />
            Filters
            {hasFilters && (
              <span className="ml-1 w-4 h-4 bg-[#1976d2] text-white rounded-full text-[10px] flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-[#d0d8e0] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#667781] mb-1">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full border border-[#d0d8e0] rounded-md px-2.5 py-1.5 text-sm bg-white"
              >
                <option value="">All actions</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#667781] mb-1">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full border border-[#d0d8e0] rounded-md px-2.5 py-1.5 text-sm bg-white"
              >
                <option value="">All sections</option>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {sectionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#667781] mb-1">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-[#d0d8e0] rounded-md px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#667781] mb-1">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-[#d0d8e0] rounded-md px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#667781] mb-1">
                User (hash prefix)
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#667781]"
                />
                <input
                  type="text"
                  value={userHash}
                  onChange={(e) => setUserHash(e.target.value)}
                  placeholder="e.g. a3f8b2c1"
                  className="w-full border border-[#d0d8e0] rounded-md pl-8 pr-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={applyFilters}
              className="px-3 py-1.5 text-sm bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0]"
            >
              Apply Filters
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#667781] hover:text-[#1a2a3a]"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-lg border border-[#d0d8e0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-[#1976d2] border-t-transparent rounded-full" />
          </div>
        ) : !data?.logs.length ? (
          <div className="text-center py-16 text-[#667781]">
            <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No audit logs found</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-[#1976d2] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#d0d8e0]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#667781]">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#667781]">
                      Action
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#667781]">
                      Section
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#667781]">
                      Details
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#667781]">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[#f0f2f5] hover:bg-[#f8fafc]"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#667781]">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.action === "update"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              entry.action === "update"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#1a2a3a]">
                        {sectionLabel(entry.section)}
                      </td>
                      <td className="px-4 py-2.5 text-[#667781] max-w-xs truncate">
                        {entry.details || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#667781]">
                        {entry.userHash.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#f0f2f5]">
              <p className="text-xs text-[#667781]">
                Showing {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} of{" "}
                {data.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={data.page <= 1}
                  className="p-1.5 rounded hover:bg-[#f0f2f5] disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-sm text-[#667781]">
                  {data.page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.totalPages}
                  className="p-1.5 rounded hover:bg-[#f0f2f5] disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
