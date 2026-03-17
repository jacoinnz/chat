import { TAXONOMY, CONTENT_TYPES, type MetadataFilters, type TenantTaxonomyConfig } from "./taxonomy";

export type QueryIntent =
  | "keyword"
  | "question"
  | "topic"
  | "recent"
  | "person";

export interface IntentResult {
  intent: QueryIntent;
  refinedQuery: string;
  detectedFilters: Partial<MetadataFilters>;
  sortByRecency: boolean;
  author?: string;
  fileType?: string;
}

const QUESTION_STARTERS =
  /^(who|what|where|when|how|why|which|can|does|is|are|do|should|could|would)\b/i;

const RECENCY_TERMS =
  /\b(latest|newest|recent|recently|last updated|this week|this month|today|yesterday|new)\b/i;

const PERSON_PATTERNS = [
  /\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
  /\bfrom\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\b/,
];

const FILE_TYPE_KEYWORDS: Record<string, string> = {
  excel: "xlsx",
  spreadsheet: "xlsx",
  word: "docx",
  document: "docx",
  pdf: "pdf",
  powerpoint: "pptx",
  presentation: "pptx",
  image: "png",
  photo: "jpg",
  video: "mp4",
  csv: "csv",
};

/** Strip question words from the beginning of a query */
function stripQuestionWords(query: string): string {
  return query
    .replace(QUESTION_STARTERS, "")
    .replace(/^(the|a|an|our|my|their|is|are|was|were)\s+/gi, "")
    .replace(/\?+$/, "")
    .trim();
}

/** Match query tokens against taxonomy values and return detected filters */
function detectTaxonomyFilters(
  query: string,
  config?: TenantTaxonomyConfig
): Partial<MetadataFilters> {
  const filters: Partial<MetadataFilters> = {};
  const lower = query.toLowerCase();

  const departments = config?.taxonomy.department ?? TAXONOMY.department;
  const contentTypes = config?.contentTypes ?? (CONTENT_TYPES as unknown as string[]);
  const sensitivities = config?.taxonomy.sensitivity ?? TAXONOMY.sensitivity;
  const statuses = config?.taxonomy.status ?? TAXONOMY.status;

  for (const dept of departments) {
    if (lower.includes(dept.toLowerCase())) {
      filters.department = dept;
      break;
    }
  }

  for (const ct of contentTypes) {
    if (lower.includes(ct.toLowerCase())) {
      filters.contentType = ct;
      break;
    }
  }

  for (const sens of sensitivities) {
    if (lower.includes(sens.toLowerCase())) {
      filters.sensitivity = sens;
      break;
    }
  }

  for (const status of statuses) {
    if (lower.includes(status.toLowerCase())) {
      filters.status = status;
      break;
    }
  }

  return filters;
}

/** Detect file type keyword in query */
function detectFileType(query: string): string | undefined {
  const lower = query.toLowerCase();
  for (const [keyword, ext] of Object.entries(FILE_TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return ext;
  }
  return undefined;
}

/** Extract author name from query */
function detectAuthor(query: string): string | undefined {
  for (const pattern of PERSON_PATTERNS) {
    const match = query.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

/** Analyze user query to determine intent, extract entities, and refine the query.
 *  When config is provided, uses tenant-specific taxonomy values for filter detection. */
export function analyzeIntent(query: string, config?: TenantTaxonomyConfig): IntentResult {
  const trimmed = query.trim();
  const detectedFilters = detectTaxonomyFilters(trimmed, config);
  const author = detectAuthor(trimmed);
  const fileType = detectFileType(trimmed);
  const isRecency = RECENCY_TERMS.test(trimmed);
  const isQuestion = QUESTION_STARTERS.test(trimmed) || trimmed.endsWith("?");

  // Determine primary intent
  let intent: QueryIntent = "keyword";
  if (author) {
    intent = "person";
  } else if (isRecency) {
    intent = "recent";
  } else if (isQuestion) {
    intent = "question";
  } else if (Object.keys(detectedFilters).length > 0) {
    intent = "topic";
  }

  // Refine query: strip question words, recency terms for cleaner KQL
  let refinedQuery = trimmed;
  if (isQuestion) {
    refinedQuery = stripQuestionWords(refinedQuery);
  }
  // Remove recency terms (Graph doesn't understand "latest")
  refinedQuery = refinedQuery.replace(RECENCY_TERMS, "").replace(/\s{2,}/g, " ").trim();
  // Remove file type keywords (handled via FileType KQL)
  if (fileType) {
    for (const [keyword] of Object.entries(FILE_TYPE_KEYWORDS)) {
      refinedQuery = refinedQuery.replace(new RegExp(`\\b${keyword}\\b`, "gi"), "").trim();
    }
    refinedQuery = refinedQuery.replace(/\s{2,}/g, " ").trim();
  }

  // Fallback if refinement emptied the query
  if (!refinedQuery) {
    refinedQuery = trimmed;
  }

  return {
    intent,
    refinedQuery,
    detectedFilters,
    sortByRecency: isRecency,
    author,
    fileType,
  };
}
