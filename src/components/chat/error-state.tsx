"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-full">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-red-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-red-800">Something went wrong</h3>
          <p className="text-xs text-red-600 mt-1">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors font-medium mt-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
