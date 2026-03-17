"use client";

import { useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import { DEFAULT_SEARCH_BEHAVIOUR, type SearchBehaviour } from "@/lib/taxonomy-defaults";
import { Loader2, Save, RotateCcw } from "lucide-react";

export default function SearchBehaviourPage() {
  const { instance } = useMsal();
  const [behaviour, setBehaviour] = useState<SearchBehaviour>(DEFAULT_SEARCH_BEHAVIOUR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getToken = useCallback(async () => {
    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) throw new Error("No account");
    const response = await instance.acquireTokenSilent({
      scopes: graphScopes.admin,
      account,
    });
    return response.accessToken;
  }, [instance]);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const response = await fetch("/api/admin/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.searchBehaviour) {
            setBehaviour({ ...DEFAULT_SEARCH_BEHAVIOUR, ...data.searchBehaviour });
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/search-behaviour", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ searchBehaviour: behaviour }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Search behaviour saved successfully" });
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save search behaviour" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setBehaviour({ ...DEFAULT_SEARCH_BEHAVIOUR });
    setMessage({ type: "success", text: "Reset to defaults (save to apply)" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1a2a3a]">Search Behaviour</h2>
          <p className="text-xs text-[#667781] mt-0.5">
            Control default safety filters, result limits, and ranking weights for your organisation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#d0d8e0] rounded-md text-[#667781] hover:text-[#1a2a3a] hover:border-[#1a2a3a] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`text-sm px-4 py-2 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Default Safety Filters */}
      <section className="bg-white rounded-lg border border-[#d0d8e0] p-4">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-1">Default Safety Filters</h3>
        <p className="text-xs text-[#667781] mb-3">
          These defaults are applied when users first open the chat. Users can still toggle them off.
        </p>
        <div className="space-y-3">
          <ToggleRow
            label="Approved Only"
            description="Show only documents with Status = Approved by default"
            checked={behaviour.approvedOnly}
            onChange={(v) => setBehaviour({ ...behaviour, approvedOnly: v })}
          />
          <ToggleRow
            label="Hide Restricted"
            description="Exclude documents with Sensitivity = Restricted by default"
            checked={behaviour.hideRestricted}
            onChange={(v) => setBehaviour({ ...behaviour, hideRestricted: v })}
          />
        </div>
      </section>

      {/* Result Limits */}
      <section className="bg-white rounded-lg border border-[#d0d8e0] p-4">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-1">Result Limits</h3>
        <p className="text-xs text-[#667781] mb-3">
          Control how many results are returned per search query.
        </p>
        <div className="space-y-3">
          <SliderRow
            label="Max Results"
            description="Number of search results per query"
            value={behaviour.maxResults}
            min={5}
            max={50}
            step={5}
            unit="results"
            onChange={(v) => setBehaviour({ ...behaviour, maxResults: v })}
          />
          <SliderRow
            label="Recency Boost Window"
            description="Documents updated within this period get a ranking boost"
            value={behaviour.recencyBoostDays}
            min={7}
            max={365}
            step={7}
            unit="days"
            onChange={(v) => setBehaviour({ ...behaviour, recencyBoostDays: v })}
          />
        </div>
      </section>

      {/* Ranking Weights */}
      <section className="bg-white rounded-lg border border-[#d0d8e0] p-4">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-1">Ranking Weights</h3>
        <p className="text-xs text-[#667781] mb-3">
          Adjust how much each factor influences result ranking. Higher values increase impact.
          Set to 0 to disable a factor.
        </p>
        <div className="space-y-3">
          <SliderRow
            label="Recency"
            description="Boost recently modified documents"
            value={behaviour.recencyWeight}
            min={0}
            max={5}
            step={0.5}
            onChange={(v) => setBehaviour({ ...behaviour, recencyWeight: v })}
          />
          <SliderRow
            label="Match Quality"
            description="Boost documents with strong title/summary matches"
            value={behaviour.matchWeight}
            min={0}
            max={5}
            step={0.5}
            onChange={(v) => setBehaviour({ ...behaviour, matchWeight: v })}
          />
          <SliderRow
            label="Freshness Penalty"
            description="Penalise stale/archived documents"
            value={behaviour.freshnessWeight}
            min={0}
            max={5}
            step={0.5}
            onChange={(v) => setBehaviour({ ...behaviour, freshnessWeight: v })}
          />
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-[#1a2a3a]">{label}</div>
        <div className="text-xs text-[#667781]">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4 ${
          checked ? "bg-[#1976d2]" : "bg-[#d0d8e0]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-sm text-[#1a2a3a]">{label}</div>
          <div className="text-xs text-[#667781]">{description}</div>
        </div>
        <span className="text-sm font-medium text-[#1976d2] shrink-0 ml-4">
          {value}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[#d0d8e0] rounded-full appearance-none cursor-pointer accent-[#1976d2]"
      />
    </div>
  );
}
