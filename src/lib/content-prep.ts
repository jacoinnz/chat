import type { SearchHit } from "@/types/search";
import { sanitizeContent } from "./safety";

/**
 * Strip Microsoft Graph Search highlight tags (<c0>, </c0>, <ddd/>) and
 * sanitize all remaining HTML to prevent content injection.
 */
export function stripHighlightTags(summary: string): string {
  const withoutGraphTags = summary
    .replace(/<c0>/g, "")
    .replace(/<\/c0>/g, "")
    .replace(/<ddd\/>/g, "...");
  return sanitizeContent(withoutGraphTags);
}

/**
 * Extract highlighted terms from Graph Search summary and return clean text.
 * Graph API wraps matched terms in <c0>...</c0> tags.
 */
export function formatSummary(summary: string): {
  text: string;
  highlights: string[];
} {
  const highlights: string[] = [];
  const regex = /<c0>(.*?)<\/c0>/g;
  let match;
  while ((match = regex.exec(summary)) !== null) {
    if (match[1] && !highlights.includes(match[1])) {
      highlights.push(match[1]);
    }
  }
  return { text: stripHighlightTags(summary), highlights };
}

/**
 * Detect if a search hit is a SharePoint page (vs a file/document).
 */
export function isSharePointPage(hit: SearchHit): boolean {
  const url = hit.resource.webUrl?.toLowerCase() || "";
  const odataType = hit.resource["@odata.type"]?.toLowerCase() || "";
  return (
    url.includes("/sitepages/") ||
    odataType.includes("sitepage") ||
    odataType.includes("page")
  );
}

/**
 * Remove duplicate search results. Uses hitId as primary key (always unique
 * per Graph API result). Falls back to listItemUniqueId or webUrl for
 * cross-entity dedup. Keeps the highest-ranked (lowest rank number) hit.
 */
export function deduplicateHits(hits: SearchHit[]): SearchHit[] {
  const seen = new Map<string, SearchHit>();

  for (const hit of hits) {
    // Primary key: hitId is always unique per search result
    const uniqueId =
      hit.resource.parentReference?.sharepointIds?.listItemUniqueId;

    // Use listItemUniqueId to merge driveItem+listItem for same document
    const key = uniqueId
      ? `uid:${uniqueId}`
      : hit.resource.webUrl
        ? `url:${hit.resource.webUrl}`
        : `hit:${hit.hitId}`;

    const existing = seen.get(key);
    if (!existing || hit.rank < existing.rank) {
      seen.set(key, hit);
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.rank - b.rank);
}
