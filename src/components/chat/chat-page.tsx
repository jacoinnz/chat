"use client";

import { useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { searchSharePoint } from "@/lib/graph-search";
import type { ChatMessage } from "@/types/search";

export function ChatPage() {
  const { instance } = useMsal();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I can search your SharePoint files. Type a keyword or phrase to get started.",
      timestamp: new Date(),
    },
  ]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSendMessage = useCallback(
    async (query: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      const loadingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsSearching(true);

      try {
        const { hits, total } = await searchSharePoint(instance, query);

        const responseMessage: ChatMessage = {
          id: loadingMessage.id,
          role: "assistant",
          content:
            hits.length > 0
              ? `Found ${total} result${total !== 1 ? "s" : ""} for "${query}".`
              : `No results found for "${query}". Try different keywords.`,
          results: hits.length > 0 ? hits : undefined,
          timestamp: new Date(),
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMessage.id ? responseMessage : m
          )
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMessage.id
              ? { ...m, content: `Search failed: ${errorMsg}`, isLoading: false }
              : m
          )
        );
      } finally {
        setIsSearching(false);
      }
    },
    [instance]
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <MessageList messages={messages} />
      <ChatInput onSend={handleSendMessage} disabled={isSearching} />
    </div>
  );
}
