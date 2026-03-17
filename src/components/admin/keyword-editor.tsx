"use client";

import { useState } from "react";
import { Plus, X, BookOpen } from "lucide-react";
import type { KeywordGroup } from "@/lib/taxonomy-defaults";

interface KeywordEditorProps {
  groups: KeywordGroup[];
  onChange: (groups: KeywordGroup[]) => void;
}

export function KeywordEditor({ groups, onChange }: KeywordEditorProps) {
  const [newTerm, setNewTerm] = useState("");

  const handleAddGroup = () => {
    const trimmed = newTerm.trim();
    if (!trimmed || groups.some((g) => g.term.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...groups, { term: trimmed, synonyms: [] }]);
    setNewTerm("");
  };

  const handleRemoveGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };

  const handleAddSynonym = (groupIndex: number, synonym: string) => {
    const trimmed = synonym.trim();
    if (!trimmed) return;
    const group = groups[groupIndex];
    if (group.synonyms.includes(trimmed)) return;
    const updated = [...groups];
    updated[groupIndex] = { ...group, synonyms: [...group.synonyms, trimmed] };
    onChange(updated);
  };

  const handleRemoveSynonym = (groupIndex: number, synIndex: number) => {
    const updated = [...groups];
    updated[groupIndex] = {
      ...updated[groupIndex],
      synonyms: updated[groupIndex].synonyms.filter((_, i) => i !== synIndex),
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <KeywordGroupRow
          key={`${group.term}-${gi}`}
          group={group}
          onAddSynonym={(syn) => handleAddSynonym(gi, syn)}
          onRemoveSynonym={(si) => handleRemoveSynonym(gi, si)}
          onRemoveGroup={() => handleRemoveGroup(gi)}
        />
      ))}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGroup(); } }}
          placeholder="Add keyword group..."
          className="flex-1 h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors"
        />
        <button
          type="button"
          onClick={handleAddGroup}
          disabled={!newTerm.trim()}
          className="h-8 px-3 bg-[#1976d2] text-white text-sm rounded-md hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

function KeywordGroupRow({
  group,
  onAddSynonym,
  onRemoveSynonym,
  onRemoveGroup,
}: {
  group: KeywordGroup;
  onAddSynonym: (synonym: string) => void;
  onRemoveSynonym: (index: number) => void;
  onRemoveGroup: () => void;
}) {
  const [newSyn, setNewSyn] = useState("");

  return (
    <div className="bg-white border border-[#d0d8e0] rounded-lg p-3 group/card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-[#1976d2]" />
          <span className="text-sm font-medium text-[#1a2a3a]">{group.term}</span>
        </div>
        <button
          type="button"
          onClick={onRemoveGroup}
          className="opacity-0 group-hover/card:opacity-100 text-[#667781] hover:text-red-500 transition-opacity"
          aria-label={`Remove ${group.term}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {group.synonyms.map((syn, si) => (
          <span
            key={`${syn}-${si}`}
            className="inline-flex items-center gap-1 text-xs bg-[#e8eef4] text-[#1a2a3a] rounded-full px-2.5 py-1"
          >
            {syn}
            <button
              type="button"
              onClick={() => onRemoveSynonym(si)}
              className="text-[#667781] hover:text-red-500"
              aria-label={`Remove synonym ${syn}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {group.synonyms.length === 0 && (
          <span className="text-xs text-[#667781] italic">No synonyms yet</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newSyn}
          onChange={(e) => setNewSyn(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddSynonym(newSyn);
              setNewSyn("");
            }
          }}
          placeholder="Add synonym..."
          className="flex-1 h-7 text-xs rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-2.5 outline-none focus:border-[#1976d2] transition-colors"
        />
        <button
          type="button"
          onClick={() => { onAddSynonym(newSyn); setNewSyn(""); }}
          disabled={!newSyn.trim()}
          className="h-7 px-2 text-xs bg-[#e8eef4] text-[#1976d2] rounded-md hover:bg-[#d0d8e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
