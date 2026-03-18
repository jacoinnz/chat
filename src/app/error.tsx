"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#e8eef4]">
      <div className="text-center max-w-md px-6">
        <h2 className="text-lg font-semibold text-[#1a2a3a] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[#667781] mb-4">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1976d2] rounded-lg hover:bg-[#0d3b66] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
