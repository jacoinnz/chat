"use client";

import { FileResultCard } from "./file-result-card";
import type { ChatMessage } from "@/types/search";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" />
            </div>
            <span className="text-sm text-muted-foreground">
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
        className={`rounded-2xl px-4 py-3 max-w-[85%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        }`}
      >
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        {message.results && message.results.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.results.map((hit) => (
              <FileResultCard key={hit.hitId} hit={hit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
