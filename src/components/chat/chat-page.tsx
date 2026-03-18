"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { FilterBar } from "./filter-bar";
import { SiteSelector } from "./site-selector";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { EmptyState } from "./empty-state";
import { DocumentPreviewPanel } from "./document-preview-panel";
import { searchSharePoint, fetchUserSites } from "@/lib/graph-search";
import { buildDocumentContext, buildConversationHistory } from "@/lib/context-builder";
import { useTenantConfig } from "@/components/providers/tenant-config-provider";
import { useSidebarContext } from "@/components/shell/sidebar-context";
import { useRecentSearches, useFavorites } from "@/hooks/use-user-data";
import { graphScopes } from "@/lib/msal-config";
import type { MetadataFilters } from "@/lib/taxonomy";
import type { ChatMessage, ChatApiRequest, SharePointSite, SearchHit } from "@/types/search";

/** Fire-and-forget usage log. Non-blocking — failures are silently ignored. */
async function logUsage(
  instance: ReturnType<typeof useMsal>["instance"],
  event: "search" | "chat" | "error" | "no_results" | "graph_error" | "auth_error",
  extra?: { errorCode?: string; resultCount?: number; filtersUsed?: MetadataFilters; intentType?: string }
) {
  try {
    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) return;
    const tokenResponse = await instance.acquireTokenSilent({
      scopes: graphScopes.search,
      account,
    });
    fetch("/api/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
      body: JSON.stringify({
        event,
        errorCode: extra?.errorCode,
        resultCount: extra?.resultCount,
        filtersUsed: extra?.filtersUsed,
        intentType: extra?.intentType,
      }),
    }).catch(() => {});
  } catch {
    // Silently ignore — usage logging is best-effort
  }
}

export function ChatPage() {
  const { instance } = useMsal();
  const { config } = useTenantConfig();
  const { registerExecuteQuery } = useSidebarContext();
  const { recordSearch } = useRecentSearches();
  const { favorites, toggleFavorite } = useFavorites();
  const favoritedUrls = new Set(favorites.map((f) => f.documentUrl));

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
  const [previewHit, setPreviewHit] = useState<SearchHit | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState("");

  // Use tenant-configured defaults for safety toggles
  const [filters, setFilters] = useState<MetadataFilters>({
    approvedOnly: false,
    hideRestricted: false,
  });

  // Sync filter defaults when config loads
  const configApplied = useRef(false);
  useEffect(() => {
    if (config?.searchBehaviour && !configApplied.current) {
      configApplied.current = true;
      setFilters((prev) => ({
        ...prev,
        approvedOnly: config.searchBehaviour.approvedOnly,
        hideRestricted: config.searchBehaviour.hideRestricted,
      }));
    }
  }, [config]);

  // Register sidebar handler for cross-component communication
  useEffect(() => {
    registerExecuteQuery((query: string) => {
      if (query) handleSendMessage(query);
    });
  }); // intentionally no deps — always register latest handler

  const [sites, setSites] = useState<SharePointSite[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchUserSites(instance).then(setSites).catch(() => {});
  }, [instance]);

  const handleFeedback = useCallback(
    async (messageId: string, type: "thumbs_up" | "thumbs_down") => {
      try {
        const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
        if (!account) return;
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: graphScopes.search,
          account,
        });
        fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenResponse.accessToken}`,
          },
          body: JSON.stringify({ messageId, feedbackType: type }),
        }).catch(() => {});
      } catch {
        // Best-effort
      }
    },
    [instance]
  );

  const handleSendMessage = useCallback(
    async (query: string) => {
      // Abort any in-flight stream
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      const assistantId = crypto.randomUUID();
      const loadingMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsSearching(true);
      setSrAnnouncement("Searching...");

      try {
        // Phase 1: Search SharePoint (with tenant config)
        const { hits, total, intent } = await searchSharePoint(instance, query, filters, undefined, config);
        logUsage(instance, "search", {
          resultCount: hits.length,
          filtersUsed: filters,
          intentType: intent.intent,
        });

        // Record search for recent searches
        recordSearch(query, hits.length);

        if (hits.length === 0) {
          logUsage(instance, "no_results", { intentType: intent.intent });
          setSrAnnouncement("No results found");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: "",
                    noResults: true,
                    noResultsQuery: query,
                    isLoading: false,
                    intent,
                  }
                : m
            )
          );
          setIsSearching(false);
          return;
        }

        // Phase 2: Show results + start streaming
        setSrAnnouncement(`Found ${hits.length} result${hits.length !== 1 ? "s" : ""}`);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "",
                  results: hits,
                  isLoading: false,
                  isStreaming: true,
                  intent,
                }
              : m
          )
        );

        // Phase 3: Stream Claude response
        const documentContext = buildDocumentContext(hits);
        const conversationHistory = buildConversationHistory([
          ...messages,
          userMessage,
        ]);

        const apiRequest: ChatApiRequest = {
          messages: [
            ...conversationHistory,
            { role: "user", content: query },
          ],
          currentDocuments: documentContext,
          keywords: config?.keywords,
        };

        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiRequest),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // Graceful fallback: show results without AI summary
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Found ${total} result${total !== 1 ? "s" : ""}. (AI summary unavailable)`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsSearching(false);
          return;
        }

        // Phase 4: Read the plain text stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: snapshot }
                : m
            )
          );
        }

        // Done streaming
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false }
              : m
          )
        );
        logUsage(instance, "chat");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          // Stream was aborted by user sending a new message
          return;
        }

        const errorMsg =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.";

        // Classify errors for monitoring
        const isGraphError = errorMsg.includes("Graph search failed");
        const isAuthError = errorMsg.includes("No active account") || errorMsg.includes("acquireToken");
        const eventType = isGraphError ? "graph_error" : isAuthError ? "auth_error" : "error";

        logUsage(instance, eventType, { errorCode: errorMsg });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.results
                    ? `Found ${m.results.length} result${m.results.length !== 1 ? "s" : ""}. (AI summary unavailable)`
                    : `Search failed: ${errorMsg}`,
                  isLoading: false,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsSearching(false);
        abortRef.current = null;
      }
    },
    [instance, filters, messages, config, recordSearch]
  );

  const isEmptyState = messages.length === 1 && messages[0].id === "welcome";

  const handleSelectQuery = (query: string) => {
    handleSendMessage(query);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#e8eef4]">
      <FilterBar filters={filters} onChange={setFilters} />
      <SiteSelector
        sites={sites}
        selected={filters.siteUrls || []}
        onChange={(urls) => setFilters((prev) => ({ ...prev, siteUrls: urls.length > 0 ? urls : undefined }))}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {isEmptyState ? (
            <EmptyState onSelectQuery={handleSelectQuery} />
          ) : (
            <MessageList
              messages={messages}
              onFeedback={handleFeedback}
              onSelectQuery={handleSelectQuery}
              onPreview={setPreviewHit}
              favoritedUrls={favoritedUrls}
              onToggleFavorite={toggleFavorite}
            />
          )}
          <ChatInput onSend={handleSendMessage} disabled={isSearching} />
        </div>
        {previewHit && (
          <DocumentPreviewPanel
            hit={previewHit}
            onClose={() => setPreviewHit(null)}
          />
        )}
      </div>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {srAnnouncement}
      </div>
    </div>
  );
}
