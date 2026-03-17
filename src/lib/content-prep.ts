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
 * Remove duplicate search results. Two hits are considered duplicates if they
 * share the same file name AND file size (same file in multiple locations),
 * or if they share the same listItemUniqueId. The highest-ranked (lowest rank
 * number) hit is kept.
 */
export function deduplicateHits(hits: SearchHit[]): SearchHit[] {
  const seen = new Map<string, SearchHit>();

  for (const hit of hits) {
    const uniqueId =
      hit.resource.parentReference?.sharepointIds?.listItemUniqueId;

    // Key 1: listItemUniqueId (exact same item)
    if (uniqueId) {
      const key = `uid:${uniqueId}`;
      const existing = seen.get(key);
      if (!existing || hit.rank < existing.rank) {
        seen.set(key, hit);
      }
      continue;
    }

    // Key 2: name + size (same file copied to multiple locations)
    const name = hit.resource.name?.toLowerCase() || "";
    const size = hit.resource.size ?? -1;
    const key = `ns:${name}:${size}`;
    const existing = seen.get(key);
    if (!existing || hit.rank < existing.rank) {
      seen.set(key, hit);
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.rank - b.rank);
}
