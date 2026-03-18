"use client";

import { Search, Lightbulb } from "lucide-react";
import { useRecentSearches } from "@/hooks/use-user-data";

const EXAMPLE_QUERIES = [
  "Latest HR policies",
  "Q4 financial report",
  "Project management templates",
  "IT security guidelines",
  "Employee onboarding checklist",
  "Marketing strategy deck",
];

const TIPS = [
  "Use specific keywords for better results",
  "Try filtering by department or content type",
  "Add quotes for exact phrase matching",
  'Use dates like "last month" to find recent docs',
];

interface EmptyStateProps {
  onSelectQuery: (query: string) => void;
}

export function EmptyState({ onSelectQuery }: EmptyStateProps) {
  const { searches } = useRecentSearches();

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1976d2]/10 mb-2">
            <Search className="h-6 w-6 text-[#1976d2]" />
          </div>
          <h2 className="text-lg font-semibold text-[#0d3b66]">
            Search your SharePoint files
          </h2>
          <p className="text-sm text-[#667781]">
            Ask a question or type keywords to find documents across your organization.
          </p>
        </div>

        {/* Example queries */}
        <div>
          <h3 className="text-xs font-medium text-[#667781] uppercase tracking-wider mb-2">
            Try asking
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXAMPLE_QUERIES.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => onSelectQuery(query)}
                className="text-left px-3 py-2.5 rounded-lg bg-white border border-[#d0d8e0] hover:border-[#1976d2] hover:bg-[#1976d2]/5 transition-colors text-sm text-[#1a2a3a] shadow-sm"
              >
                <span className="text-[#1976d2] mr-1.5">&ldquo;</span>
                {query}
                <span className="text-[#1976d2] ml-1.5">&rdquo;</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent searches */}
        {searches.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-[#667781] uppercase tracking-wider mb-2">
              Recent searches
            </h3>
            <div className="space-y-1">
              {searches.slice(0, 5).map((search) => (
                <button
                  key={search.id}
                  type="button"
                  onClick={() => onSelectQuery(search.query)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-white/80 transition-colors text-sm text-[#1a2a3a]"
                >
                  <Search className="h-3.5 w-3.5 text-[#667781] shrink-0" />
                  <span className="truncate">{search.query}</span>
                  {search.resultCount > 0 && (
                    <span className="text-[10px] text-[#667781] ml-auto shrink-0">
                      {search.resultCount} results
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/60 rounded-lg px-4 py-3 border border-[#d0d8e0]">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-medium text-[#667781] uppercase tracking-wider">
              Tips for better results
            </h3>
          </div>
          <ul className="space-y-1">
            {TIPS.map((tip) => (
              <li key={tip} className="text-xs text-[#667781] flex items-start gap-1.5">
                <span className="text-[#1976d2] mt-0.5">&#x2022;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
