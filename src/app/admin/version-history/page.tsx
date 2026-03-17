"use client";

import { useState } from "react";
import { useConfigVersions, useRollback, type ConfigVersionEntry } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { MessageBanner } from "@/components/admin/save-bar";
import { Loader2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

const SECTION_LABELS: Record<string, string> = {
  taxonomy: "Metadata",
  "content-types": "Content Types",
  keywords: "Keywords",
  "review-policies": "Review Policies",
  "search-behaviour": "Search Behaviour",
  "kql-map": "KQL Mapping",
  "search-fields": "Search Fields",
  config: "Full Config",
  reset: "Reset to Defaults",
  rollback: "Rollback",
  draft: "Draft",
};

function StatusBadge({ status }: { status: string }) {
  const colors = status === "published"
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colors}`}>
      {status}
    </span>
  );
}

function VersionRow({
  entry,
  onRollback,
  rolling,
}: {
  entry: ConfigVersionEntry;
  onRollback: (id: string) => void;
  rolling: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const date = new Date(entry.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-[#e8eef4] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-mono text-[#667781] w-8 shrink-0">v{entry.version}</span>
        <StatusBadge status={entry.status} />
        <span className="text-sm text-[#1a2a3a] truncate">
          {SECTION_LABELS[entry.section] || entry.section}
        </span>
        {entry.comment && (
          <span className="text-xs text-[#667781] truncate hidden sm:inline">
            — {entry.comment}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-[#667781]">{entry.authorName || "Unknown"}</div>
          <div className="text-[10px] text-[#667781]/70">{date}</div>
        </div>
        {entry.status === "published" && (
          confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onRollback(entry.id); setConfirming(false); }}
                disabled={rolling}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs px-2 py-1 border border-[#d0d8e0] rounded text-[#667781] hover:text-[#1a2a3a] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 text-xs px-2 py-1 border border-[#d0d8e0] rounded text-[#667781] hover:text-[#1a2a3a] hover:border-[#1a2a3a] transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Rollback
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function VersionHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useConfigVersions(page);
  const { rollback, rolling } = useRollback();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRollback = async (versionId: string) => {
    const result = await rollback(versionId);
    if (result.success) {
      setMessage({ type: "success", text: "Configuration rolled back successfully" });
      refetch();
    } else {
      setMessage({ type: "error", text: result.error || "Rollback failed" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-red-600 py-8 text-center">
        Failed to load version history
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Version History</h2>
        <p className="text-xs text-[#667781] mt-0.5">
          Every configuration change is recorded. You can rollback to any previous version.
        </p>
      </div>
      <MessageBanner message={message} />

      <SectionCard title={`${data.total} version${data.total === 1 ? "" : "s"}`}>
        {data.versions.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#667781]">
            No configuration changes recorded yet. Changes will appear here after saving any configuration section.
          </div>
        ) : (
          <div>
            {data.versions.map((v) => (
              <VersionRow
                key={v.id}
                entry={v}
                onRollback={handleRollback}
                rolling={rolling}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#d0d8e0] rounded-md text-[#667781] hover:text-[#1a2a3a] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="text-xs text-[#667781]">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#d0d8e0] rounded-md text-[#667781] hover:text-[#1a2a3a] disabled:opacity-30 transition-colors"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
