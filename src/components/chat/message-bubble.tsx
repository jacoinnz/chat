"use client";

import { useState } from "react";
import { Search, ThumbsUp, ThumbsDown, Sparkles, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { FileResultCard } from "./file-result-card";
import { NoResultsState } from "./no-results-state";
import { ErrorState } from "./error-state";
import type { ChatMessage, SearchHit } from "@/types/search";

interface MessageBubbleProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, type: "thumbs_up" | "thumbs_down") => void;
  onSelectQuery?: (query: string) => void;
  onPreview?: (hit: SearchHit) => void;
  favoritedUrls?: Set<string>;
  onToggleFavorite?: (url: string, title: string, siteName?: string) => void;
}

const COLLAPSE_THRESHOLD = 500;
const RESULTS_PAGE_SIZE = 5;

function CitedText({
  content,
  results,
  isStreaming,
}: {
  content: string;
  results?: SearchHit[];
  isStreaming?: boolean;
}) {
  const parts = content.split(/(\[\d+\])/g);

  const handleCitationClick = (index: number) => {
    if (!results || index < 1 || index > results.length) return;
    const cardId = `file-card-${results[index - 1].hitId}`;
    const el = document.getElementById(cardId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.classList.add("ring-2", "ring-[#1976d2]");
    setTimeout(() => el.classList.remove("ring-2", "ring-[#1976d2]"), 2000);
  };

  return (
    <span className="text-xs sm:text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          return (
            <sup
              key={i}
              onClick={() => handleCitationClick(idx)}
              className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] text-[9px] font-semibold bg-[#1976d2] text-white rounded-full cursor-pointer hover:bg-[#0d3b66] transition-colors mx-0.5 px-1"
              aria-label={`Citation ${idx}`}
            >
              {idx}
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 bg-[#667781] ml-0.5 animate-pulse rounded-sm" />
      )}
    </span>
  );
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
  if (filters.contentType) parts.push(`Type: ${filters.contentType}`);
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

function FeedbackButtons({
  messageId,
  onFeedback,
}: {
  messageId: string;
  onFeedback: (messageId: string, type: "thumbs_up" | "thumbs_down") => void;
}) {
  const [sent, setSent] = useState<"thumbs_up" | "thumbs_down" | null>(null);

  const handleClick = (type: "thumbs_up" | "thumbs_down") => {
    if (sent) return;
    setSent(type);
    onFeedback(messageId, type);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <button
        type="button"
        onClick={() => handleClick("thumbs_up")}
        className={`p-0.5 rounded transition-colors ${
          sent === "thumbs_up"
            ? "text-green-600"
            : sent
              ? "text-[#d0d8e0]"
              : "text-[#9aa5ad] hover:text-green-600"
        }`}
        disabled={!!sent}
        aria-label="Thumbs up"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => handleClick("thumbs_down")}
        className={`p-0.5 rounded transition-colors ${
          sent === "thumbs_down"
            ? "text-red-500"
            : sent
              ? "text-[#d0d8e0]"
              : "text-[#9aa5ad] hover:text-red-500"
        }`}
        disabled={!!sent}
        aria-label="Thumbs down"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  );
}

export function MessageBubble({
  message,
  onFeedback,
  onSelectQuery,
  onPreview,
  favoritedUrls,
  onToggleFavorite,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [expanded, setExpanded] = useState(false);
  const [visibleResults, setVisibleResults] = useState(RESULTS_PAGE_SIZE);

  const timestamp = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Detect error messages
  const isError = !isUser && message.content.startsWith("Search failed:");

  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div
          role="article"
          aria-label="Loading response"
          className="relative bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm wa-tail-left"
        >
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

  // Determine if content should be collapsible
  const isLongContent = !isUser && message.content.length > COLLAPSE_THRESHOLD;
  const showFullContent = !isLongContent || expanded;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        role="article"
        aria-label={isUser ? "Your message" : "Assistant response"}
        className={`relative rounded-lg px-3 py-1.5 max-w-[85%] shadow-sm ${
          isUser
            ? "bg-[#d4e6f1] text-[#1a2a3a] rounded-tr-none wa-tail-right"
            : "bg-white text-[#1a2a3a] rounded-tl-none wa-tail-left"
        }`}
      >
        {/* AI Generated label */}
        {!isUser && message.content && !message.isLoading && !isError && (
          <div className="flex items-center gap-1 mb-1 text-[10px] text-[#1976d2] font-medium">
            <Sparkles className="h-3 w-3" />
            AI Generated
          </div>
        )}

        {/* No results state */}
        {message.noResults && message.noResultsQuery && (
          <NoResultsState
            query={message.noResultsQuery}
            onSelectQuery={onSelectQuery}
          />
        )}

        {/* Error state */}
        {isError && (
          <ErrorState message={message.content.replace("Search failed: ", "")} />
        )}

        {/* Normal content with optional collapse */}
        {message.content && !isError && !message.noResults && (
          <div className="relative">
            <div className={!showFullContent ? "max-h-[200px] overflow-hidden" : ""}>
              <CitedText
                content={message.content}
                results={message.results}
                isStreaming={message.isStreaming}
              />
            </div>
            {!showFullContent && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
            )}
            {isLongContent && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mt-1 text-[11px] text-[#1976d2] hover:text-[#0d3b66] font-medium transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show more
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {message.intent && message.results && message.results.length > 0 && (
          <IntentIndicator intent={message.intent} />
        )}

        {message.results && message.results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.results.slice(0, visibleResults).map((hit) => (
              <FileResultCard
                key={hit.hitId}
                hit={hit}
                onPreview={onPreview}
                isFavorited={favoritedUrls?.has(hit.resource.webUrl)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
            {message.results.length > visibleResults && (
              <button
                type="button"
                onClick={() => setVisibleResults((v) => v + RESULTS_PAGE_SIZE)}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-[#1976d2] hover:text-[#0d3b66] font-medium bg-[#f0f2f5] hover:bg-[#e8eef4] rounded-lg transition-colors"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                Show more results ({message.results.length - visibleResults} remaining)
              </button>
            )}
          </div>
        )}

        {!isUser && message.results && message.results.length > 0 && (
          <p className="text-[9px] text-[#667781] mt-1.5 leading-tight">
            Results from SharePoint search. Verify against official sources.
          </p>
        )}

        {!isUser && !message.isLoading && !message.isStreaming && message.content && onFeedback && !isError && (
          <FeedbackButtons messageId={message.id} onFeedback={onFeedback} />
        )}

        <span className="block text-[10px] text-[#667781] text-right mt-1 -mb-0.5">
          {timestamp}
        </span>
      </div>
    </div>
  );
}
