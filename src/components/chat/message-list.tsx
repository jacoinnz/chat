"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage, SearchHit } from "@/types/search";

interface MessageListProps {
  messages: ChatMessage[];
  onFeedback?: (messageId: string, type: "thumbs_up" | "thumbs_down") => void;
  onSelectQuery?: (query: string) => void;
  onPreview?: (hit: SearchHit) => void;
  favoritedUrls?: Set<string>;
  onToggleFavorite?: (url: string, title: string, siteName?: string) => void;
}

export function MessageList({
  messages,
  onFeedback,
  onSelectQuery,
  onPreview,
  favoritedUrls,
  onToggleFavorite,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-4 wa-chat-bg">
      <div className="max-w-3xl mx-auto py-2 sm:py-4 space-y-1 sm:space-y-2">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onFeedback={onFeedback}
            onSelectQuery={onSelectQuery}
            onPreview={onPreview}
            favoritedUrls={favoritedUrls}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
