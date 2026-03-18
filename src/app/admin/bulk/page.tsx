"use client";

import { useState, useRef } from "react";
import { useAdminToken } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { MessageBanner } from "@/components/admin/save-bar";
import { Download, Upload, Loader2 } from "lucide-react";

type Message = { type: "success" | "error"; text: string };

export default function BulkPage() {
  const { getToken } = useAdminToken();
  const [message, setMessage] = useState<Message | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/config/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to export configuration" });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? "tenant-config.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Configuration exported successfully" });
    } catch {
      setMessage({ type: "error", text: "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      const token = await getToken();
      const res = await fetch("/api/admin/config/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message ?? "Configuration saved as draft" });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error ?? "Import failed — check JSON format" });
      }
    } catch {
      setMessage({ type: "error", text: "Invalid JSON file" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Import / Export</h2>
        <p className="text-sm text-[#667781] mt-1">
          Bulk manage tenant configuration via JSON files.
        </p>
      </div>

      {message && <MessageBanner message={message} />}

      <SectionCard title="Export Configuration" description="Download the current tenant configuration as a JSON file for backup or migration.">
        <button
          type="button"
          disabled={exporting}
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1976d2] rounded-md hover:bg-[#1565c0] disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export JSON
        </button>
      </SectionCard>

      <SectionCard title="Import Configuration" description="Upload a JSON configuration file. It will be saved as a draft — review and publish when ready.">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1976d2] border border-[#1976d2] rounded-md hover:bg-[#e8eef4] cursor-pointer">
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Choose File
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
          <span className="text-xs text-[#667781]">JSON files only</span>
        </div>
      </SectionCard>
    </div>
  );
}
