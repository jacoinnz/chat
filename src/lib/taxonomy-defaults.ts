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
  "ContentType",
  "Department",
  "Sensitivity",
  "Status",
  "ReviewDate",
  "Keywords",
];
