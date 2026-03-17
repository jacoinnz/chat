import { type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="bg-white rounded-lg border border-[#d0d8e0] p-4">
      <h3 className={`text-sm font-medium text-[#1a2a3a] ${description ? "mb-1" : "mb-3"}`}>
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#667781] mb-3">{description}</p>
      )}
      {children}
    </section>
  );
}
