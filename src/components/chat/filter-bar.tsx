"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { TAXONOMY, type MetadataFilters } from "@/lib/taxonomy";

interface FilterBarProps {
  filters: MetadataFilters;
  onChange: (filters: MetadataFilters) => void;
}

const FILTER_FIELDS = [
  { key: "department" as const, label: "Department", options: TAXONOMY.department },
  { key: "documentType" as const, label: "Doc Type", options: TAXONOMY.documentType },
  { key: "sensitivity" as const, label: "Sensitivity", options: TAXONOMY.sensitivity },
  { key: "status" as const, label: "Status", options: TAXONOMY.status },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = Object.entries(filters).filter(
    ([key, val]) =>
      key !== "approvedOnly" && key !== "hideRestricted" && Boolean(val)
  ).length;

  const handleChange = (key: keyof MetadataFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const handleClear = () => {
    onChange({
      approvedOnly: filters.approvedOnly,
      hideRestricted: filters.hideRestricted,
    });
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
          <div className="grid grid-cols-2 gap-1.5">
            {FILTER_FIELDS.map((field) => (
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
          </div>
          <div className="flex items-center justify-between flex-wrap gap-y-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.approvedOnly ?? false}
                  onClick={() =>
                    onChange({ ...filters, approvedOnly: !filters.approvedOnly })
                  }
                  className={`relative w-7 h-4 rounded-full transition-colors ${
                    filters.approvedOnly ? "bg-[#1976d2]" : "bg-[#d0d8e0]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      filters.approvedOnly ? "translate-x-3" : ""
                    }`}
                  />
                </button>
                <span className="text-[11px] text-[#1a2a3a]">Approved only</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.hideRestricted ?? false}
                  onClick={() =>
                    onChange({
                      ...filters,
                      hideRestricted: !filters.hideRestricted,
                    })
                  }
                  className={`relative w-7 h-4 rounded-full transition-colors ${
                    filters.hideRestricted ? "bg-red-500" : "bg-[#d0d8e0]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      filters.hideRestricted ? "translate-x-3" : ""
                    }`}
                  />
                </button>
                <span className="text-[11px] text-[#1a2a3a]">Hide restricted</span>
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
    </div>
  );
}
