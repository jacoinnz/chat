"use client";

import { FileResultCard } from "./file-result-card";
import type { ChatMessage } from "@/types/search";

interface MessageBubbleProps {
  message: ChatMessage;
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

        {message.results && message.results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.results.map((hit) => (
              <FileResultCard key={hit.hitId} hit={hit} />
            ))}
          </div>
        )}

        <span className="block text-[10px] text-[#667781] text-right mt-1 -mb-0.5">
          {timestamp}
        </span>
      </div>
    </div>
  );
}
