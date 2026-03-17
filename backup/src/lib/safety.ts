import type { SearchHit } from "@/types/search";

// ── Input Sanitization ──

/** Escape special characters to prevent KQL injection */
export function sanitizeForKql(input: string): string {
  return input
    .replace(/\\/g, "") // strip backslashes
    .replace(/"/g, "") // strip double quotes
    .replace(/;/g, "") // strip semicolons
    .replace(/[{}[\]()]/g, "") // strip brackets
    .trim()
    .slice(0, 200); // enforce max length
}

/** Strip ALL HTML tags and truncate to prevent content injection */
export function sanitizeContent(text: string): string {
  const stripped = text
    .replace(/<[^>]*>/g, "") // remove all HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/javascript:/gi, "") // strip JS protocol
    .replace(/on\w+\s*=/gi, "") // strip event handlers
    .trim();

  return stripped.slice(0, 500); // max 500 chars
}

// ── Sensitivity Classification ──

export type SensitivityLevel =
  | "Public"
  | "Internal"
  | "Confidential"
  | "Restricted";

const VALID_LEVELS: SensitivityLevel[] = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
];

/** Get the sensitivity level of a search hit */
export function getSensitivityLevel(hit: SearchHit): SensitivityLevel {
  const raw = hit.resource.listItem?.fields?.Sensitivity;
  if (raw && VALID_LEVELS.includes(raw as SensitivityLevel)) {
    return raw as SensitivityLevel;
  }
  return "Internal"; // default assumption
}

/** Check if a sensitivity level requires a warning banner */
export function requiresWarning(level: SensitivityLevel): boolean {
  return level === "Confidential" || level === "Restricted";
}

// ── Staleness Detection ──

export interface FreshnessInfo {
  isStale: boolean;
  isArchived: boolean;
  daysSinceModified: number;
  reviewDate?: string;
  warning?: string;
}

/** Calculate days between a date string and now */
function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/** Assess the freshness/staleness of a search result */
export function assessFreshness(hit: SearchHit): FreshnessInfo {
  const fields = hit.resource.listItem?.fields;
  const status = fields?.Status;
  const reviewDate = fields?.ReviewDate;
  const modifiedDays = daysSince(hit.resource.lastModifiedDateTime);

  // Archived documents
  if (status === "Archived") {
    return {
      isStale: true,
      isArchived: true,
      daysSinceModified: modifiedDays,
      reviewDate,
      warning: "This document is archived and may be outdated.",
    };
  }

  // Overdue review date
  if (reviewDate) {
    const reviewDays = daysSince(reviewDate);
    if (reviewDays > 0) {
      return {
        isStale: true,
        isArchived: false,
        daysSinceModified: modifiedDays,
        reviewDate,
        warning: `Review overdue since ${new Date(reviewDate).toLocaleDateString()}.`,
      };
    }
  }

  // Old document (>12 months without update)
  if (modifiedDays > 365) {
    const months = Math.floor(modifiedDays / 30);
    return {
      isStale: true,
      isArchived: false,
      daysSinceModified: modifiedDays,
      reviewDate,
      warning: `Last updated ${months} months ago — verify before use.`,
    };
  }

  return {
    isStale: false,
    isArchived: false,
    daysSinceModified: modifiedDays,
    reviewDate,
  };
}
