"use client";

import { FileText, Upload, Trash2 } from "lucide-react";

interface DraftBannerProps {
  authorName: string;
  createdAt: string;
  onPublish: () => void;
  onDiscard: () => void;
}

export function DraftBanner({ authorName, createdAt, onPublish, onDiscard }: DraftBannerProps) {
  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-md">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <FileText className="h-4 w-4 shrink-0" />
        <span>
          Unpublished draft{authorName ? ` by ${authorName}` : ""} on {date}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="flex items-center gap-1 px-2.5 py-1 text-xs border border-amber-300 rounded text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Discard
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
        >
          <Upload className="h-3 w-3" />
          Publish
        </button>
      </div>
    </div>
  );
}
