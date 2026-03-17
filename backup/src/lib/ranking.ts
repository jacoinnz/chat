import type { QueryIntent } from "./intent";
import type { MetadataFilters } from "./taxonomy";
import type { SearchHit } from "@/types/search";
import { isSharePointPage } from "./content-prep";
import { assessFreshness } from "./safety";

export interface RankingContext {
  query: string;
  intent: QueryIntent;
  filters: MetadataFilters;
  sortByRecency: boolean;
}

/** Calculate days between two dates */
function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/** Compute a custom relevance score for a search hit */
function computeScore(hit: SearchHit, ctx: RankingContext): number {
  let score = 1000 - hit.rank; // Invert Graph rank (lower rank = more relevant)

  const recencyMultiplier = ctx.sortByRecency ? 3 : 1;

  // Recency bonus
  if (hit.resource.lastModifiedDateTime) {
    const days = daysSince(hit.resource.lastModifiedDateTime);
    if (days <= 30) {
      score += 50 * recencyMultiplier;
    } else if (days <= 90) {
      score += 25 * recencyMultiplier;
    }
  }

  // Summary contains query string
  const queryLower = ctx.query.toLowerCase();
  if (hit.summary?.toLowerCase().includes(queryLower)) {
    score += 30;
  }

  // Title contains a query word
  const nameLower = hit.resource.name?.toLowerCase() || "";
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
  for (const word of queryWords) {
    if (nameLower.includes(word)) {
      score += 40;
      break; // Only count once
    }
  }

  // Metadata matches active filters
  const fields = hit.resource.listItem?.fields;
  if (fields) {
    if (ctx.filters.department && fields.Department === ctx.filters.department) {
      score += 20;
    }
    if (ctx.filters.contentType && fields.ContentType === ctx.filters.contentType) {
      score += 20;
    }
  }

  // Approved status bonus
  if (fields?.Status === "Approved") {
    score += 15;
  }

  // Non-empty document (> 10KB)
  if ((hit.resource.size ?? 0) > 10240) {
    score += 10;
  }

  // SharePoint page boost (procedure pages)
  if (isSharePointPage(hit)) {
    score += 10;
  }

  // Safety penalties — push stale/archived content down
  const freshness = assessFreshness(hit);
  if (freshness.isArchived) {
    score -= 100;
  } else if (freshness.isStale) {
    score -= 50;
  }
  // Overdue review date penalty (additional to stale)
  if (freshness.reviewDate) {
    const reviewTime = new Date(freshness.reviewDate).getTime();
    if (!isNaN(reviewTime) && reviewTime < Date.now()) {
      score -= 30;
    }
  }

  return score;
}

/** Re-rank search results using custom scoring */
export function rankResults(
  hits: SearchHit[],
  context: RankingContext
): SearchHit[] {
  return [...hits].sort(
    (a, b) => computeScore(b, context) - computeScore(a, context)
  );
}
