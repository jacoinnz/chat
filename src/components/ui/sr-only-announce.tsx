"use client";

interface SrOnlyAnnounceProps {
  message: string;
}

export function SrOnlyAnnounce({ message }: SrOnlyAnnounceProps) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
