"use client";

import { useAdminConfig } from "@/hooks/use-admin-api";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import { DraftBanner } from "@/components/admin/draft-banner";
import { DEFAULT_SEARCH_BEHAVIOUR, type SearchBehaviour } from "@/lib/taxonomy-defaults";
import { Loader2 } from "lucide-react";

export default function SearchBehaviourPage() {
  const {
    data: behaviour, setData: setBehaviour, loading, saving, message,
    save, saveAsDraft, reset, hasDraft, draftInfo, publishDraft, discardDraft,
  } = useAdminConfig<SearchBehaviour>(
    "searchBehaviour",
    "/api/admin/search-behaviour",
    DEFAULT_SEARCH_BEHAVIOUR,
    (c) => c.searchBehaviour ? { ...DEFAULT_SEARCH_BEHAVIOUR, ...c.searchBehaviour } : null
  );

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
          <p className="text-xs text-[#667781] mt-0.5">Control default safety filters, result limits, and ranking weights for your organisation.</p>
        </div>
        <SaveBar saving={saving} onSave={save} onReset={() => reset({ ...DEFAULT_SEARCH_BEHAVIOUR })} resetLabel="Reset" onSaveAsDraft={saveAsDraft} />
      </div>
      <MessageBanner message={message} />
      {hasDraft && draftInfo && (
        <DraftBanner
          authorName={draftInfo.authorName}
          createdAt={draftInfo.createdAt}
          onPublish={publishDraft}
          onDiscard={discardDraft}
        />
      )}

      <SectionCard
        title="Default Safety Filters"
        description="These defaults are applied when users first open the chat. Users can still toggle them off."
      >
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
      </SectionCard>

      <SectionCard
        title="Result Limits"
        description="Control how many results are returned per search query."
      >
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
      </SectionCard>

      <SectionCard
        title="Ranking Weights"
        description="Adjust how much each factor influences result ranking. Higher values increase impact. Set to 0 to disable a factor."
      >
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
      </SectionCard>
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
