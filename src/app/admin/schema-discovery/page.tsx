"use client";

import { useState, useCallback, useMemo } from "react";
import { useAdminToken, useAdminFetch, useAdminSave } from "@/hooks/use-admin-api";
import { useTokenAcquisition } from "@/hooks/use-token";
import { graphScopes } from "@/lib/msal-config";
import { MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import {
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  Plus,
  Save,
} from "lucide-react";

interface DiscoveredProperty {
  id: string;
  name: string;
  type: string;
  searchable: boolean;
  queryable: boolean;
  retrievable: boolean;
  refinable: boolean;
  mappings: string | null;
  lastScrapedAt: string;
}

interface SchemaResponse {
  properties: DiscoveredProperty[];
  source: "cache" | "scraped";
  count: number;
}

export default function SchemaDiscoveryPage() {
  const { getToken } = useAdminToken();
  const { getToken: getSearchToken } = useTokenAcquisition(graphScopes.search);
  const {
    data: schema,
    loading,
    refetch,
  } = useAdminFetch<SchemaResponse>("/api/admin/search-schema", {
    extraHeaders: async () => ({ "X-SharePoint-Token": await getSearchToken() }),
  });
  const { save: doSave, saving, message, setMessage } = useAdminSave({ optimistic: true });

  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [refinableOnly, setRefinableOnly] = useState(false);
  const [staged, setStaged] = useState<Record<string, string>>({});

  const properties = schema?.properties ?? [];

  // Unique types for filter dropdown
  const types = useMemo(() => {
    const set = new Set(properties.map((p) => p.type));
    return Array.from(set).sort();
  }, [properties]);

  // Filtered properties
  const filtered = useMemo(() => {
    let result = properties;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.mappings ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((p) => p.type === typeFilter);
    }
    if (refinableOnly) {
      result = result.filter((p) => p.refinable);
    }
    return result;
  }, [properties, searchQuery, typeFilter, refinableOnly]);

  const handleScrape = useCallback(async () => {
    setScraping(true);
    setMessage(null);
    try {
      const token = await getToken();
      const searchToken = await getSearchToken();
      const response = await fetch("/api/admin/search-schema", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-SharePoint-Token": searchToken,
        },
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Schema scraped successfully" });
        refetch();
      } else {
        setMessage({ type: "error", text: "Failed to scrape schema" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to scrape schema" });
    } finally {
      setScraping(false);
    }
  }, [getToken, refetch, setMessage]);

  const stageProperty = useCallback(
    (name: string) => {
      // Default mapping key: lowercase property name
      const key = name.replace(/^Refinable(String|Int|Date|Double|Decimal)\d+$/, name);
      setStaged((prev) => ({ ...prev, [key]: name }));
    },
    []
  );

  const unstageProperty = useCallback((key: string) => {
    setStaged((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSaveToKqlMap = useCallback(async () => {
    if (Object.keys(staged).length === 0) return;

    // Fetch current KQL map, merge staged, save back
    try {
      const token = await getToken();
      const configRes = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!configRes.ok) {
        setMessage({ type: "error", text: "Failed to load current config" });
        return;
      }
      const config = await configRes.json();
      const current = (config.kqlPropertyMap as Record<string, string>) ?? {};
      const merged = { ...current, ...staged };

      const ok = await doSave(
        "/api/admin/kql-map",
        { kqlPropertyMap: merged },
        `Added ${Object.keys(staged).length} properties to KQL map`
      );
      if (ok) {
        setStaged({});
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save KQL map" });
    }
  }, [staged, getToken, doSave, setMessage]);

  const stagedCount = Object.keys(staged).length;
  const isStaged = (name: string) =>
    Object.values(staged).includes(name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1a2a3a]">
            Schema Discovery
          </h2>
          <p className="text-xs text-[#667781] mt-0.5">
            {properties.length} managed properties found
            {schema?.source === "cache" && " (cached)"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleScrape}
          disabled={scraping}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 transition-colors"
        >
          {scraping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Scrape Now
        </button>
      </div>

      <MessageBanner message={message} />

      {/* Filters */}
      <SectionCard title="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#667781]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] bg-white"
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-sm text-[#667781] cursor-pointer">
            <input
              type="checkbox"
              checked={refinableOnly}
              onChange={(e) => setRefinableOnly(e.target.checked)}
              className="rounded border-[#d0d8e0]"
            />
            Refinable only
          </label>
        </div>
      </SectionCard>

      {/* Properties table */}
      <SectionCard
        title="Managed Properties"
        description={`Showing ${filtered.length} of ${properties.length} properties`}
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d0d8e0] text-left text-xs text-[#667781] uppercase tracking-wider">
                <th className="px-4 sm:px-5 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Mappings</th>
                <th className="px-3 py-2 font-medium text-center">Refinable</th>
                <th className="px-3 py-2 font-medium text-center">Retrievable</th>
                <th className="px-3 py-2 font-medium text-center w-[100px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d8e0]/50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 sm:px-5 py-8 text-center text-[#667781]"
                  >
                    {properties.length === 0
                      ? "No properties found. Click \"Scrape Now\" to discover your tenant's search schema."
                      : "No properties match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-[#f8f9fa] transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-2 font-mono text-xs text-[#1a2a3a]">
                      {prop.name}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#667781]">
                      {prop.type}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#667781] max-w-[200px] truncate">
                      {prop.mappings || "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {prop.refinable ? (
                        <Check className="h-4 w-4 text-green-600 inline-block" />
                      ) : (
                        <X className="h-4 w-4 text-[#d0d8e0] inline-block" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {prop.retrievable ? (
                        <Check className="h-4 w-4 text-green-600 inline-block" />
                      ) : (
                        <X className="h-4 w-4 text-[#d0d8e0] inline-block" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isStaged(prop.name) ? (
                        <span className="text-xs text-green-600 font-medium">
                          Staged
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => stageProperty(prop.name)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#d0d8e0] rounded text-[#667781] hover:text-[#1976d2] hover:border-[#1976d2] transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Staged properties bar */}
      {stagedCount > 0 && (
        <div className="sticky bottom-0 bg-white border border-[#d0d8e0] rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1a2a3a]">
                {stagedCount} {stagedCount === 1 ? "property" : "properties"}{" "}
                staged for KQL map
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Object.entries(staged).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[#1976d2]/10 text-[#1976d2] rounded-full"
                  >
                    {key}={value}
                    <button
                      type="button"
                      onClick={() => unstageProperty(key)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveToKqlMap}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save to KQL Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
