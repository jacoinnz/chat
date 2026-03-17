"use client";

import { Search } from "lucide-react";
import { FileResultCard } from "./file-result-card";
import type { ChatMessage } from "@/types/search";

interface MessageBubbleProps {
  message: ChatMessage;
}

function IntentIndicator({
  intent,
}: {
  intent: NonNullable<ChatMessage["intent"]>;
}) {
  const parts: string[] = [];

  if (intent.refinedQuery) {
    parts.push(`"${intent.refinedQuery}"`);
  }

  const filters = intent.detectedFilters;
  if (filters.department) parts.push(`Dept: ${filters.department}`);
  if (filters.documentType) parts.push(`Type: ${filters.documentType}`);
  if (filters.sensitivity) parts.push(`${filters.sensitivity}`);
  if (filters.status) parts.push(`${filters.status}`);

  if (intent.sortByRecency) {
    parts.push("Recent first");
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1.5 mb-0.5 text-[10px] text-[#667781] bg-[#f0f2f5] rounded px-2 py-1">
      <Search className="h-3 w-3 shrink-0" />
      <span className="truncate">{parts.join(" · ")}</span>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const timestamp = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="relative bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm wa-tail-left">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-2 w-2 bg-[#667781]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 bg-[#667781]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 bg-[#667781]/40 rounded-full animate-bounce" />
            </div>
            <span className="text-xs text-[#667781]">
              Searching SharePoint...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative rounded-lg px-3 py-1.5 max-w-[85%] shadow-sm ${
          isUser
            ? "bg-[#d4e6f1] text-[#1a2a3a] rounded-tr-none wa-tail-right"
            : "bg-white text-[#1a2a3a] rounded-tl-none wa-tail-left"
        }`}
      >
        {message.content && (
          <p className="text-xs sm:text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {message.intent && message.results && message.results.length > 0 && (
          <IntentIndicator intent={message.intent} />
        )}

        {message.results && message.results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.results.map((hit) => (
              <FileResultCard key={hit.hitId} hit={hit} />
            ))}
          </div>
        )}

        {!isUser && message.results && message.results.length > 0 && (
          <p className="text-[9px] text-[#667781] mt-1.5 leading-tight">
            Results from SharePoint search. Verify against official sources.
          </p>
        )}

        <span className="block text-[10px] text-[#667781] text-right mt-1 -mb-0.5">
          {timestamp}
        </span>
      </div>
    </div>
  );
}
