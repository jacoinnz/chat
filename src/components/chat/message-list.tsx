"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage } from "@/types/search";

interface MessageListProps {
  messages: ChatMessage[];
  onFeedback?: (messageId: string, type: "thumbs_up" | "thumbs_down") => void;
}

export function MessageList({ messages, onFeedback }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-4 wa-chat-bg">
      <div className="max-w-3xl mx-auto py-2 sm:py-4 space-y-1 sm:space-y-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onFeedback={onFeedback} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
