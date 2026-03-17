"use client";

import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";

interface EditableListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function EditableList({ items, onChange, placeholder = "Add item..." }: EditableListProps) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setNewItem("");
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex items-center gap-2 bg-white border border-[#d0d8e0] rounded-md px-3 py-1.5 group"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-[#667781] hover:text-[#1a2a3a] disabled:opacity-30 text-[10px] leading-none"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
                className="text-[#667781] hover:text-[#1a2a3a] disabled:opacity-30 text-[10px] leading-none"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <GripVertical className="h-3.5 w-3.5 text-[#d0d8e0]" />
            <span className="flex-1 text-sm text-[#1a2a3a]">{item}</span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="opacity-0 group-hover:opacity-100 text-[#667781] hover:text-red-500 transition-opacity"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-8 text-sm rounded-md border border-[#d0d8e0] bg-white text-[#1a2a3a] px-3 outline-none focus:border-[#1976d2] transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="h-8 px-3 bg-[#1976d2] text-white text-sm rounded-md hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}
