"use client";

import { SearchX } from "lucide-react";

interface NoResultsStateProps {
  query: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onSelectQuery?: (query: string) => void;
}

const SUGGESTIONS = [
  "Try broader search terms",
  "Check your spelling",
  "Remove some filters to widen the search",
  "Try searching with fewer keywords",
];

export function NoResultsState({ query, hasFilters, onClearFilters, onSelectQuery }: NoResultsStateProps) {
  return (
    <div className="bg-white rounded-lg px-4 py-4 shadow-sm max-w-full">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
          <SearchX className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#1a2a3a]">
            No results found for &ldquo;{query}&rdquo;
          </h3>
          <div className="mt-2 space-y-1">
            {SUGGESTIONS.map((s) => (
              <p key={s} className="text-xs text-[#667781] flex items-start gap-1.5">
                <span className="text-[#1976d2] mt-0.5">&#x2022;</span>
                {s}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {hasFilters && onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs bg-[#1976d2]/10 text-[#1976d2] px-3 py-1.5 rounded-full hover:bg-[#1976d2]/20 transition-colors font-medium"
              >
                Clear all filters
              </button>
            )}
            {onSelectQuery && (
              <button
                type="button"
                onClick={() => onSelectQuery("HR policies")}
                className="text-xs bg-[#f0f2f5] text-[#667781] px-3 py-1.5 rounded-full hover:bg-[#e8eef4] transition-colors"
              >
                Try: &ldquo;HR policies&rdquo;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
