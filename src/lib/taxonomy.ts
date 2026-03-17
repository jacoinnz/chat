export const TAXONOMY = {
  department: ["Engineering", "HR", "Finance", "Legal", "Operations", "Marketing", "IT"],
  documentType: ["Policy", "SOP", "Guide", "Template", "Report", "Form"],
  sensitivity: ["Public", "Internal", "Confidential", "Restricted"],
  status: ["Draft", "Approved", "Archived"],
} as const;

export interface MetadataFilters {
  department?: string;
  documentType?: string;
  sensitivity?: string;
  status?: string;
  approvedOnly?: boolean;
  hideRestricted?: boolean;
}

/** Map string-valued filter keys to SharePoint managed property names */
const KQL_PROPERTY_MAP: Record<string, string> = {
  department: "Department",
  documentType: "DocType",
  sensitivity: "Sensitivity",
  status: "Status",
};

/** Convert active filters to a KQL filter string */
export function buildKqlFilter(filters: MetadataFilters): string {
  const parts: string[] = [];

  // Handle approvedOnly toggle
  if (filters.approvedOnly) {
    parts.push('Status:"Approved"');
  }

  // Handle hideRestricted toggle
  if (filters.hideRestricted) {
    parts.push('NOT Sensitivity:"Restricted"');
  }

  for (const [key, value] of Object.entries(filters)) {
    if (key === "approvedOnly") continue;
    if (typeof value === "string" && value) {
      const property = KQL_PROPERTY_MAP[key];
      if (property) {
        parts.push(`${property}:"${value}"`);
      }
    }
  }

  return parts.join(" AND ");
}
