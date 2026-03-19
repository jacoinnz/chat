// ═══════════════════════════════════════════════════════════════════════
// SHAREPOINT METADATA MODEL
// ═══════════════════════════════════════════════════════════════════════
//
// Two tiers of metadata properties:
//
// TIER 1 — BUILT-IN: Always indexed and searchable in any SharePoint
//   Online tenant. No admin configuration required. These use standard
//   managed property names (ContentType, FileType, Author, etc.).
//
// TIER 2 — CUSTOM: Require the tenant admin to:
//   1. Create SharePoint site columns (Department, Sensitivity, etc.)
//   2. Wait for the columns to be crawled (automatic, may take hours)
//   3. Verify the managed properties exist in the search schema
//      (Site settings → Search Schema → Managed Properties)
//   If auto-mapping doesn't create the managed property, map the
//   crawled property (ows_Department) to a refinable slot
//   (RefinableString00) and update KQL_PROPERTY_MAP below.
//
// See docs/ARCHITECTURE.md § Metadata & Taxonomy Layer for full setup.
// ═══════════════════════════════════════════════════════════════════════

import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
  type KeywordGroup,
  type ReviewPolicy,
  type SearchBehaviour,
} from "./taxonomy-defaults";

// ── Tenant Config Interface ──────────────────────────────────────────
// Matches the shape stored in the TenantConfig DB model.
// Passed through the app to make taxonomy, KQL map, and search fields
// dynamic per tenant.

export interface TenantTaxonomyConfig {
  taxonomy: {
    department: string[];
    sensitivity: string[];
    status: string[];
  };
  contentTypes: string[];
  kqlPropertyMap: Record<string, string>;
  searchFields: string[];
  keywords: KeywordGroup[];
  reviewPolicies: ReviewPolicy[];
  searchBehaviour: SearchBehaviour;
}

// ── Tier 1: Built-In Properties ──────────────────────────────────────

/** SharePoint content types — KQL: ContentType. Always indexed.
 *  These are the standard content types present in all SharePoint tenants. */
export const CONTENT_TYPES = [
  "Document",
  "Form",
  "Report",
  "Wiki Page",
  "Task",
  "Link to a Document",
  "Picture",
] as const;

/** File type labels → KQL FileType extension values. Always indexed. */
export const FILE_TYPES = {
  Word: "docx",
  Excel: "xlsx",
  PDF: "pdf",
  PowerPoint: "pptx",
  OneNote: "one",
  CSV: "csv",
  Image: "png",
  Video: "mp4",
} as const;

/** Date range labels → days back. KQL: LastModifiedTime. Always indexed. */
export const DATE_RANGES = {
  "Past week": 7,
  "Past month": 30,
  "Past 3 months": 90,
  "Past year": 365,
} as const;

// ── Tier 2: Custom Properties ────────────────────────────────────────

/** Custom metadata field values. These require matching SharePoint site
 *  columns to exist in the target tenant's document libraries. */
export const TAXONOMY = {
  department: ["Engineering", "HR", "Finance", "Legal", "Operations", "Marketing", "IT"],
  sensitivity: ["Public", "Internal", "Confidential", "Restricted"],
  status: ["Draft", "Approved", "Archived"],
} as const;

// ── Graph Search Fields ──────────────────────────────────────────────
// Passed to the Graph Search API `fields` parameter. Returns these as
// listItem.fields values for display on result cards.
// Names must match SharePoint site column internal names (PascalCase).

// IMPORTANT: These fields MUST always be requested or normalizeHit()
// cannot reconstruct webUrl/name from driveItem results.
// Never allow tenant config to remove these — only extend them.
export const ESSENTIAL_FIELDS = [
  "FileLeafRef",      // Filename with extension (list column)
  "FileRef",          // Server-relative URL path (list column)
  "Path",             // Full URL to the document
  "Filename",         // File name with extension
  "Title",            // List item title (fallback name)
] as const;

export const SEARCH_FIELDS = [
  ...ESSENTIAL_FIELDS,
  // Built-in list column names
  "ContentType",      // SharePoint content type (list column)
  // Search managed properties
  "Author",           // Author display name
  "LastModifiedTime", // Modified ISO datetime
  "Created",          // Created ISO datetime
  "Size",             // File size in bytes
  // Custom properties (require tenant site columns)
  "Department",
  "Sensitivity",
  "Status",
  "ReviewDate",
  "Keywords",
] as const;

// ── Filter Interface ─────────────────────────────────────────────────

export interface MetadataFilters {
  // Built-in filters (always work)
  contentType?: string;
  fileType?: string;
  dateRange?: string;
  siteUrls?: string[];
  // Custom filters (require tenant site columns)
  department?: string;
  sensitivity?: string;
  status?: string;
  // Safety toggles
  approvedOnly?: boolean;
  hideRestricted?: boolean;
}

// ── KQL Property Mapping ─────────────────────────────────────────────
// Maps MetadataFilters keys to SharePoint managed property names.
//
// Built-in properties use their standard names — always work.
// Custom properties use the auto-mapped managed property name
// (SharePoint Online auto-creates managed properties for site columns).
//
// If auto-mapping doesn't work in your tenant, map your site columns
// to refinable managed property slots in the search schema:
//   Department  → RefinableString00
//   Sensitivity → RefinableString01
//   Status      → RefinableString02
// Then update the values below to match.

const KQL_PROPERTY_MAP: Record<string, string> = {
  // Built-in (always available)
  contentType: "ContentType",
  // Custom (auto-mapped from site columns — see note above)
  department:  "Department",
  sensitivity: "Sensitivity",
  status:      "Status",
};

/** Convert active filters to a KQL filter string.
 *  When config is provided, uses tenant-specific KQL property map. */
export function buildKqlFilter(filters: MetadataFilters, config?: TenantTaxonomyConfig): string {
  const propertyMap = config?.kqlPropertyMap ?? KQL_PROPERTY_MAP;
  const parts: string[] = [];

  // Handle approvedOnly toggle — ignored when explicit status is set to avoid
  // contradictory KQL (e.g. Status:"Approved" AND Status:"Draft")
  if (filters.approvedOnly && !filters.status) {
    parts.push(`${propertyMap.status || KQL_PROPERTY_MAP.status}:"Approved"`);
  }

  // Handle hideRestricted toggle — ignored when explicit sensitivity is set
  if (filters.hideRestricted && !filters.sensitivity) {
    parts.push(`NOT ${propertyMap.sensitivity || KQL_PROPERTY_MAP.sensitivity}:"Restricted"`);
  }

  // String-valued taxonomy filters → mapped managed properties
  for (const [key, value] of Object.entries(filters)) {
    if (key === "approvedOnly" || key === "hideRestricted" || key === "fileType" || key === "dateRange" || key === "siteUrls") continue;
    if (typeof value === "string" && value) {
      const property = propertyMap[key];
      if (property) {
        parts.push(`${property}:"${value}"`);
      }
    }
  }

  // File type filter → FileType:ext (built-in managed property)
  if (filters.fileType) {
    const ext = FILE_TYPES[filters.fileType as keyof typeof FILE_TYPES];
    if (ext) {
      parts.push(`FileType:${ext}`);
    }
  }

  // Date range filter → LastModifiedTime>=YYYY-MM-DD (built-in managed property)
  if (filters.dateRange) {
    const days = DATE_RANGES[filters.dateRange as keyof typeof DATE_RANGES];
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      parts.push(`LastModifiedTime>=${cutoff.toISOString().split("T")[0]}`);
    }
  }

  // Site scope → Path filter (built-in managed property)
  if (filters.siteUrls && filters.siteUrls.length > 0) {
    if (filters.siteUrls.length === 1) {
      parts.push(`Path:"${filters.siteUrls[0]}"`);
    } else {
      const siteParts = filters.siteUrls.map((url) => `Path:"${url}"`);
      parts.push(`(${siteParts.join(" OR ")})`);
    }
  }

  return parts.join(" AND ");
}
