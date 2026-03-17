"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import { TAXONOMY, CONTENT_TYPES, FILE_TYPES, DATE_RANGES, type MetadataFilters } from "@/lib/taxonomy";
import type { SharePointSite } from "@/types/search";

interface FilterBarProps {
  filters: MetadataFilters;
  onChange: (filters: MetadataFilters) => void;
  sites: SharePointSite[];
}

const TAXONOMY_FIELDS = [
  { key: "contentType" as const, label: "Content Type", options: CONTENT_TYPES },
  { key: "department" as const, label: "Department", options: TAXONOMY.department },
  { key: "sensitivity" as const, label: "Sensitivity", options: TAXONOMY.sensitivity },
  { key: "status" as const, label: "Status", options: TAXONOMY.status },
];

const CHIP_LABELS: Record<string, string> = {
  contentType: "Type",
  department: "Dept",
  sensitivity: "Sensitivity",
  status: "Status",
  fileType: "File",
  dateRange: "Modified",
  siteUrl: "Site",
};

export function FilterBar({ filters, onChange, sites }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  // Build a lookup from siteUrl → displayName for chip labels
  const siteNameMap = new Map(sites.map((s) => [s.webUrl, s.displayName]));

  // Collect active string-valued filters (excludes boolean toggles)
  const activeFilters = Object.entries(filters).filter(
    ([key, val]) =>
      key !== "approvedOnly" && key !== "hideRestricted" && typeof val === "string" && Boolean(val)
  ) as [string, string][];
  const activeCount = activeFilters.length;

  const handleChange = (key: keyof MetadataFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const handleRemoveFilter = (key: string) => {
    onChange({ ...filters, [key]: undefined });
  };

  const handleClear = () => {
    onChange({
      approvedOnly: filters.approvedOnly,
      hideRestricted: filters.hideRestricted,
    });
  };

  // Toggles are disabled when an explicit value overrides them
  const approvedDisabled = !!filters.status;
  const restrictedDisabled = !!filters.sensitivity;

  /** Render a chip value — for siteUrl, show the site name instead of the URL */
  const chipValue = (key: string, value: string) => {
    if (key === "siteUrl") return siteNameMap.get(value) || value;
    return value;
  };

  return (
    <div className="shrink-0 border-b border-[#d0d8e0] bg-[#f0f2f5]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#667781] hover:text-[#1a2a3a] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="bg-[#1976d2] text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {/* Site selector — full width */}
          <select
            value={filters.siteUrl || ""}
            onChange={(e) => handleChange("siteUrl", e.target.value)}
            className="w-full h-7 text-[11px] rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-2 outline-none focus:border-[#1976d2] transition-colors"
          >
            <option value="">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.webUrl}>
                {site.displayName}
              </option>
            ))}
          </select>

          {/* Taxonomy + built-in filters — 2-column grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {TAXONOMY_FIELDS.map((field) => (
              <select
                key={field.key}
                value={filters[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="h-7 text-[11px] rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-2 outline-none focus:border-[#1976d2] transition-colors"
              >
                <option value="">{field.label}</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ))}
            <select
              value={filters.fileType || ""}
              onChange={(e) => handleChange("fileType", e.target.value)}
              className="h-7 text-[11px] rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-2 outline-none focus:border-[#1976d2] transition-colors"
            >
              <option value="">File Type</option>
              {Object.keys(FILE_TYPES).map((ft) => (
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>
            <select
              value={filters.dateRange || ""}
              onChange={(e) => handleChange("dateRange", e.target.value)}
              className="h-7 text-[11px] rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-2 outline-none focus:border-[#1976d2] transition-colors"
            >
              <option value="">Modified</option>
              {Object.keys(DATE_RANGES).map((dr) => (
                <option key={dr} value={dr}>
                  {dr}
                </option>
              ))}
            </select>
          </div>

          {/* Safety toggles */}
          <div className="flex items-center justify-between flex-wrap gap-y-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!approvedDisabled && (filters.approvedOnly ?? false)}
                  disabled={approvedDisabled}
                  onClick={() =>
                    onChange({ ...filters, approvedOnly: !filters.approvedOnly })
                  }
                  className={`relative w-7 h-4 rounded-full transition-colors ${
                    approvedDisabled
                      ? "bg-[#d0d8e0] opacity-50 cursor-not-allowed"
                      : filters.approvedOnly
                        ? "bg-[#1976d2]"
                        : "bg-[#d0d8e0]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      !approvedDisabled && filters.approvedOnly ? "translate-x-3" : ""
                    }`}
                  />
                </button>
                <span className={`text-[11px] ${approvedDisabled ? "text-[#667781]" : "text-[#1a2a3a]"}`}>
                  Approved only
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!restrictedDisabled && (filters.hideRestricted ?? false)}
                  disabled={restrictedDisabled}
                  onClick={() =>
                    onChange({
                      ...filters,
                      hideRestricted: !filters.hideRestricted,
                    })
                  }
                  className={`relative w-7 h-4 rounded-full transition-colors ${
                    restrictedDisabled
                      ? "bg-[#d0d8e0] opacity-50 cursor-not-allowed"
                      : filters.hideRestricted
                        ? "bg-red-500"
                        : "bg-[#d0d8e0]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      !restrictedDisabled && filters.hideRestricted ? "translate-x-3" : ""
                    }`}
                  />
                </button>
                <span className={`text-[11px] ${restrictedDisabled ? "text-[#667781]" : "text-[#1a2a3a]"}`}>
                  Hide restricted
                </span>
              </label>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-[#1976d2] hover:text-[#0d3b66] font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active filter chips — always visible, even when panel is collapsed */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-1.5">
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-[10px] bg-[#1976d2]/10 text-[#1976d2] rounded-full px-2 py-0.5"
            >
              <span className="font-medium">{CHIP_LABELS[key] || key}:</span> {chipValue(key, value)}
              <button
                type="button"
                onClick={() => handleRemoveFilter(key)}
                className="hover:text-[#0d3b66] ml-0.5"
                aria-label={`Remove ${key} filter`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
