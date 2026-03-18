"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import type { SharePointSite } from "@/types/search";

interface SiteSelectorProps {
  sites: SharePointSite[];
  selected: string[];
  onChange: (urls: string[]) => void;
}

export function SiteSelector({ sites, selected, onChange }: SiteSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggleSite = (url: string) => {
    if (selected.includes(url)) {
      onChange(selected.filter((u) => u !== url));
    } else {
      onChange([...selected, url]);
    }
  };

  const selectAll = () => {
    onChange([]);
  };

  const label =
    selected.length === 0
      ? "All sites"
      : selected.length === 1
        ? sites.find((s) => s.webUrl === selected[0])?.displayName ?? "1 site"
        : `${selected.length} sites`;

  return (
    <div ref={containerRef} className="relative shrink-0 px-3 py-1.5 bg-[#f0f2f5] border-b border-[#d0d8e0]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select sites to search"
        className="inline-flex items-center gap-1.5 text-xs text-[#667781] hover:text-[#1a2a3a] transition-colors rounded-md border border-[#d0d8e0] bg-white px-2.5 py-1"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className={selected.length > 0 ? "text-[#1a2a3a] font-medium" : ""}>
          {label}
        </span>
        {selected.length > 0 && (
          <span className="bg-[#1976d2] text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Sites"
          className="absolute left-3 top-full mt-1 z-50 w-72 max-h-64 overflow-y-auto rounded-lg border border-[#d0d8e0] bg-white shadow-lg"
        >
          {/* All sites option */}
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            onClick={selectAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#e8eef4] transition-colors border-b border-[#d0d8e0]"
          >
            <span className={`flex items-center justify-center w-4 h-4 rounded border ${
              selected.length === 0
                ? "bg-[#1976d2] border-[#1976d2] text-white"
                : "border-[#d0d8e0]"
            }`}>
              {selected.length === 0 && <Check className="h-3 w-3" />}
            </span>
            <span className={selected.length === 0 ? "font-medium text-[#1a2a3a]" : "text-[#667781]"}>
              All sites
            </span>
          </button>

          {/* Individual sites */}
          {sites.map((site) => {
            const isSelected = selected.includes(site.webUrl);
            return (
              <button
                key={site.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleSite(site.webUrl)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#e8eef4] transition-colors"
              >
                <span className={`flex items-center justify-center w-4 h-4 rounded border ${
                  isSelected
                    ? "bg-[#1976d2] border-[#1976d2] text-white"
                    : "border-[#d0d8e0]"
                }`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <span className={`truncate ${isSelected ? "font-medium text-[#1a2a3a]" : "text-[#667781]"}`}>
                  {site.displayName}
                </span>
              </button>
            );
          })}

          {sites.length === 0 && (
            <div className="px-3 py-4 text-xs text-[#667781] text-center">
              No sites available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
