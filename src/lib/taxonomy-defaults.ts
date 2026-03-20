// ═══════════════════════════════════════════════════════════════════════
// DEFAULT TAXONOMY VALUES
// ═══════════════════════════════════════════════════════════════════════
// Hardcoded defaults used when a tenant has no custom configuration.
// Admin portal allows overriding these per tenant via the database.

export const DEFAULT_TAXONOMY = {
  department: ["Engineering", "HR", "Finance", "Legal", "Operations", "Marketing", "IT"],
  sensitivity: ["Public", "Internal", "Confidential", "Restricted"],
  status: ["Draft", "Approved", "Archived"],
};

export const DEFAULT_CONTENT_TYPES = [
  "Document",
  "Form",
  "Report",
  "Wiki Page",
  "Task",
  "Link to a Document",
  "Picture",
];

export const DEFAULT_KQL_PROPERTY_MAP: Record<string, string> = {
  contentType: "ContentType",
  department: "Department",
  sensitivity: "Sensitivity",
  status: "Status",
};

export const DEFAULT_SEARCH_FIELDS = [
  "FileLeafRef",
  "FileRef",
  "Title",
  "ContentType",
  "Path",
  "Filename",
  "Author",
  "LastModifiedTime",
  "Created",
  "Size",
  "Department",
  "Sensitivity",
  "Status",
  "ReviewDate",
  "Keywords",
];

// ── Keywords & Synonyms ────────────────────────────────────────────
// Each entry maps a canonical term to its synonyms.
// Used for query expansion in intent detection and AI grounding.

export interface KeywordGroup {
  term: string;
  synonyms: string[];
}

export const DEFAULT_KEYWORDS: KeywordGroup[] = [
  { term: "HR", synonyms: ["Human Resources", "People & Culture", "People Operations"] },
  { term: "IT", synonyms: ["Information Technology", "Tech Support", "Helpdesk"] },
  { term: "Finance", synonyms: ["Accounting", "Accounts", "Treasury"] },
  { term: "Policy", synonyms: ["Procedure", "Guideline", "Standard"] },
  { term: "Leave", synonyms: ["Annual Leave", "PTO", "Time Off", "Holiday"] },
  { term: "Onboarding", synonyms: ["Induction", "New Starter", "New Hire"] },
];

// ── Review Policies ────────────────────────────────────────────────
// Define staleness thresholds per content type.
// maxAgeDays: document flagged as stale after this many days without update.
// warningDays: warn users this many days before the document becomes stale.

export interface ReviewPolicy {
  contentType: string;
  maxAgeDays: number;
  warningDays: number;
}

export const DEFAULT_REVIEW_POLICIES: ReviewPolicy[] = [
  { contentType: "Policy", maxAgeDays: 365, warningDays: 30 },
  { contentType: "Report", maxAgeDays: 180, warningDays: 14 },
  { contentType: "Form", maxAgeDays: 365, warningDays: 30 },
  { contentType: "Document", maxAgeDays: 545, warningDays: 30 },
];

// ── Search Behaviour ───────────────────────────────────────────────
// Governs default filter states, result limits, and ranking weights.

export interface SearchBehaviour {
  approvedOnly: boolean;
  hideRestricted: boolean;
  maxResults: number;
  recencyBoostDays: number;
  recencyWeight: number;
  matchWeight: number;
  freshnessWeight: number;
}

// ── AI Provider Defaults ─────────────────────────────────────────

export const DEFAULT_AI_PROVIDER = {
  provider: "anthropic" as const,
  modelId: "claude-sonnet-4-20250514",
  keySource: "platform" as const,
  temperature: 0.3,
  maxTokens: 1024,
  enabled: true,
};

export const DEFAULT_SEARCH_BEHAVIOUR: SearchBehaviour = {
  approvedOnly: false,
  hideRestricted: false,
  maxResults: 500,
  recencyBoostDays: 30,
  recencyWeight: 1,
  matchWeight: 1,
  freshnessWeight: 1,
};
