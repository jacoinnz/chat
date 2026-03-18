"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_QUERY_LENGTH = 200;

const PLACEHOLDER_EXAMPLES = [
  "Try: 'latest HR policies'",
  "Try: 'Q4 financial report'",
  "Try: 'project templates'",
  "Try: 'IT security docs'",
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholder every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (value: string) => {
    if (value.length <= MAX_QUERY_LENGTH) {
      setInput(value);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClear = () => {
    setInput("");
  };

  const remaining = MAX_QUERY_LENGTH - input.length;
  const showCounter = remaining <= 40;

  return (
    <div className="shrink-0 border-t border-[#d0d8e0] bg-[#f0f2f5]">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto flex items-center gap-2 px-2 py-1.5"
      >
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
            disabled={disabled}
            maxLength={MAX_QUERY_LENGTH}
            className="text-sm h-9 rounded-full bg-white border-none px-4 pr-8 shadow-sm focus-visible:ring-0 w-full"
            autoFocus
            aria-label="Search query"
          />
          {input && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#667781] hover:text-[#1a2a3a] transition-colors"
              aria-label="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {showCounter && !input && (
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${
                remaining <= 10 ? "text-red-500" : "text-[#667781]"
              }`}
            >
              {remaining}
            </span>
          )}
        </div>
        <Button
          type="submit"
          disabled={disabled || !input.trim()}
          size="icon"
          className="h-9 w-9 rounded-full bg-[#1976d2] hover:bg-[#0d3b66] text-white shadow-sm shrink-0 border-none"
          aria-label="Send search query"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
