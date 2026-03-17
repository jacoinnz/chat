"use client";

import { Loader2, Save, RotateCcw, FileText } from "lucide-react";

type Message = { type: "success" | "error"; text: string };

interface SaveBarProps {
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  resetLabel?: string;
  onSaveAsDraft?: () => void;
}

export function SaveBar({
  saving,
  onSave,
  onReset,
  resetLabel = "Reset to Defaults",
  onSaveAsDraft,
}: SaveBarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#d0d8e0] rounded-md text-[#667781] hover:text-[#1a2a3a] hover:border-[#1a2a3a] transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {resetLabel}
      </button>
      {onSaveAsDraft && (
        <button
          type="button"
          onClick={onSaveAsDraft}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1976d2] rounded-md text-[#1976d2] hover:bg-[#1976d2]/5 disabled:opacity-50 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Save as Draft
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Save Changes
      </button>
    </div>
  );
}

export function MessageBanner({ message }: { message: Message | null }) {
  if (!message) return null;
  return (
    <div
      className={`text-sm px-4 py-2 rounded-md ${
        message.type === "success"
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {message.text}
    </div>
  );
}
