"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "./error-state";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-phase errors from the chat content area (MessageList,
 * FileResultCard, etc.) and shows an inline ErrorState instead of
 * crashing the entire page via the root error.tsx boundary.
 *
 * This prevents malformed search results from wiping the filter bar,
 * site selector, and chat input — only the message area is affected.
 */
export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[chat-error-boundary]", error);
  }

  private handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <ErrorState
            message={this.state.error.message || "Failed to display search results. Please try a different query."}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
