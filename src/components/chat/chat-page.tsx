"use client";

import { useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { ChatHeader } from "./chat-header";
import { FilterBar } from "./filter-bar";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { searchSharePoint } from "@/lib/graph-search";
import type { MetadataFilters } from "@/lib/taxonomy";
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
  const [filters, setFilters] = useState<MetadataFilters>({
    approvedOnly: true,
    hideRestricted: true,
  });

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
        const { hits, total, intent } = await searchSharePoint(instance, query, filters);

        const responseMessage: ChatMessage = {
          id: loadingMessage.id,
          role: "assistant",
          content:
            hits.length > 0
              ? `Found ${total} result${total !== 1 ? "s" : ""} for "${query}".`
              : `No results found for "${query}". Try different keywords.`,
          results: hits.length > 0 ? hits : undefined,
          timestamp: new Date(),
          intent,
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
    [instance, filters]
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#e8eef4]">
      <ChatHeader />
      <FilterBar filters={filters} onChange={setFilters} />
      <MessageList messages={messages} />
      <ChatInput onSend={handleSendMessage} disabled={isSearching} />
    </div>
  );
}
