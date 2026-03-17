"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface KqlMapEditorProps {
  entries: Record<string, string>;
  onChange: (entries: Record<string, string>) => void;
}

export function KqlMapEditor({ entries, onChange }: KqlMapEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const pairs = Object.entries(entries);

  const handleAdd = () => {
    const key = newKey.trim();
    const value = newValue.trim();
    if (!key || !value) return;
    onChange({ ...entries, [key]: value });
    setNewKey("");
    setNewValue("");
  };

  const handleRemove = (key: string) => {
    const updated = { ...entries };
    delete updated[key];
    onChange(updated);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...entries, [key]: value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-xs font-medium text-[#667781] px-1">
        <span>Filter Key</span>
        <span>Managed Property</span>
        <span />
      </div>

      {/* Existing entries */}
      {pairs.map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center group"
        >
          <div className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-[#f0f2f5] text-[#667781] px-3 flex items-center">
            {key}
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors"
          />
          <button
            type="button"
            onClick={() => handleRemove(key)}
            className="h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#667781] hover:text-red-500 transition-opacity"
            aria-label={`Remove ${key}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Add new entry */}
      <div className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Filter key..."
          className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Managed property..."
          className="h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newKey.trim() || !newValue.trim()}
          className="h-8 w-8 flex items-center justify-center bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Add mapping"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
