"use client";

import { useState } from "react";
import { Plus, X, ClipboardCheck } from "lucide-react";
import type { ReviewPolicy } from "@/lib/taxonomy-defaults";

interface ReviewPolicyEditorProps {
  policies: ReviewPolicy[];
  onChange: (policies: ReviewPolicy[]) => void;
}

export function ReviewPolicyEditor({ policies, onChange }: ReviewPolicyEditorProps) {
  const [newType, setNewType] = useState("");
  const [newMaxAge, setNewMaxAge] = useState("365");
  const [newWarning, setNewWarning] = useState("30");

  const handleAdd = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (policies.some((p) => p.contentType.toLowerCase() === trimmed.toLowerCase())) return;
    const maxAge = parseInt(newMaxAge, 10);
    const warning = parseInt(newWarning, 10);
    if (isNaN(maxAge) || maxAge < 1 || isNaN(warning) || warning < 0) return;
    onChange([...policies, { contentType: trimmed, maxAgeDays: maxAge, warningDays: warning }]);
    setNewType("");
    setNewMaxAge("365");
    setNewWarning("30");
  };

  const handleRemove = (index: number) => {
    onChange(policies.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof ReviewPolicy, value: string) => {
    const updated = [...policies];
    if (field === "contentType") {
      updated[index] = { ...updated[index], contentType: value };
    } else {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) return;
      updated[index] = { ...updated[index], [field]: num };
    }
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 text-xs font-medium text-[#667781] px-1">
        <span>Content Type</span>
        <span>Max Age (days)</span>
        <span>Warn Before</span>
        <span />
      </div>

      {/* Existing policies */}
      {policies.map((policy, index) => (
        <div
          key={`${policy.contentType}-${index}`}
          className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center group"
        >
          <div className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-[#f0f2f5] text-[#667781] px-3 flex items-center gap-2">
            <ClipboardCheck className="h-3 w-3 text-[#1976d2] shrink-0" />
            {policy.contentType}
          </div>
          <input
            type="number"
            min="1"
            value={policy.maxAgeDays}
            onChange={(e) => handleUpdate(index, "maxAgeDays", e.target.value)}
            className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors text-center"
          />
          <input
            type="number"
            min="0"
            value={policy.warningDays}
            onChange={(e) => handleUpdate(index, "warningDays", e.target.value)}
            className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors text-center"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#667781] hover:text-red-500 transition-opacity"
            aria-label={`Remove ${policy.contentType}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Add new policy */}
      <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center">
        <input
          type="text"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="Content type..."
          className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors"
        />
        <input
          type="number"
          min="1"
          value={newMaxAge}
          onChange={(e) => setNewMaxAge(e.target.value)}
          className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors text-center"
        />
        <input
          type="number"
          min="0"
          value={newWarning}
          onChange={(e) => setNewWarning(e.target.value)}
          className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors text-center"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newType.trim()}
          className="h-8 w-8 flex items-center justify-center bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Add policy"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
