"use client";

import { useState, FormEvent, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

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

  return (
    <div className="border-t border-[#d0d8e0] bg-[#f0f2f5]">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto flex items-center gap-2 px-2 py-1.5"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type.."
          disabled={disabled}
          className="flex-1 text-sm h-9 rounded-full bg-white border-none px-4 shadow-sm focus-visible:ring-0"
          autoFocus
        />
        <Button
          type="submit"
          disabled={disabled || !input.trim()}
          size="icon"
          className="h-9 w-9 rounded-full bg-[#1976d2] hover:bg-[#0d3b66] text-white shadow-sm shrink-0 border-none"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
