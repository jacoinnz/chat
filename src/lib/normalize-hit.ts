import { stripHighlightTags } from "./content-prep";
import type { SearchHit } from "@/types/search";

/** Map MIME types to file extensions for display when name is missing */
const MIME_TO_EXT: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
};

/**
 * Typed field resolver for Microsoft Graph Search API hits.
 *
 * Graph returns search results in two shapes:
 *   - driveItem: fields nested at resource.listItem.fields (often missing name, webUrl, size)
 *   - listItem: fields directly at resource.fields
 *
 * Field names arrive in camelCase but SharePoint managed properties use PascalCase.
 * This class normalizes the shape once in the constructor and provides typed getters
 * with explicit fallback chains for every property, so callers never need to know
 * the quirks.
 *
 * Each getter documents its fallback chain so the resolution strategy is visible
 * in one place rather than scattered across multiple functions.
 */
export class GraphHitFields {
  /** Normalized field map (original keys + PascalCase aliases), or undefined if no fields */
  readonly raw: Record<string, string> | undefined;

  private readonly resource: SearchHit["resource"];
  private readonly _summary?: string;
  private readonly _rootUrl?: string;

  constructor(hit: SearchHit, rootUrl?: string) {
    this.resource = hit.resource;
    this._summary = hit.summary;
    this._rootUrl = rootUrl;

    // Extract from whichever shape Graph returned and normalize to PascalCase
    const src = hit.resource.listItem?.fields ?? hit.resource.fields;
    if (src) {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(src)) {
        normalized[key] = value;
        const pascal = key.charAt(0).toUpperCase() + key.slice(1);
        if (pascal !== key) normalized[pascal] = value;
      }
      this.raw = normalized;
    }
  }

  // ── Document identity ─────────────────────────────────────────

  /** Fallback chain: Path → FileRef + rootUrl */
  get webUrl(): string | undefined {
    const path = this.find("Path", "path");
    if (path) return path;

    const fileRef = this.find("FileRef", "fileRef");
    if (fileRef && this._rootUrl) {
      return `${this._rootUrl}${fileRef.startsWith("/") ? "" : "/"}${fileRef}`;
    }
    return undefined;
  }

  /** Fallback chain: FileLeafRef / Filename → Title → summary snippet + MIME ext → "Document.ext" */
  get name(): string | undefined {
    const filename = this.find("FileLeafRef", "fileLeafRef", "Filename", "filename");
    if (filename) return filename;

    const title = this.find("Title", "title");
    if (title) return title;

    // Last resort: derive from MIME extension + summary snippet
    const ext = this.extension;
    const clean = this._summary ? stripHighlightTags(this._summary) : "";
    const snippet = clean.slice(0, 60)?.split(/[.\n]/)[0]?.trim();
    if (snippet) return `${snippet}${ext ? `.${ext}` : ""}`;
    if (ext) return `Document.${ext}`;

    return undefined;
  }

  // ── Dates ─────────────────────────────────────────────────────

  /** Fallback chain: resource.lastModifiedDateTime → LastModifiedTime → Modified */
  get lastModified(): string | undefined {
    return this.resource.lastModifiedDateTime
      ?? this.find("LastModifiedTime", "lastModifiedTime", "Last Modified", "Modified");
  }

  /** Fallback chain: resource.createdDateTime → Created field */
  get created(): string | undefined {
    return this.resource.createdDateTime
      ?? this.find("Created", "created");
  }

  // ── Size ──────────────────────────────────────────────────────

  /** Fallback chain: resource.size → Size field (parsed to int) */
  get size(): number | undefined {
    if (this.resource.size) return this.resource.size;
    const str = this.find("Size", "size");
    return str ? (parseInt(str, 10) || undefined) : undefined;
  }

  // ── People ────────────────────────────────────────────────────

  /** Fallback chain: resource.lastModifiedBy.user.displayName → Author field */
  get author(): string | undefined {
    return this.resource.lastModifiedBy?.user?.displayName
      ?? this.find("Author", "author");
  }

  // ── Taxonomy / managed properties ─────────────────────────────

  get contentType(): string | undefined {
    return this.find("ContentType", "contentType");
  }

  get department(): string | undefined {
    return this.find("Department", "department");
  }

  get status(): string | undefined {
    return this.find("Status", "status");
  }

  get sensitivity(): string | undefined {
    return this.find("Sensitivity", "sensitivity");
  }

  get reviewDate(): string | undefined {
    return this.find("ReviewDate", "reviewDate");
  }

  get keywords(): string | undefined {
    return this.find("Keywords", "keywords");
  }

  get title(): string | undefined {
    return this.find("Title", "title");
  }

  // ── MIME → extension ──────────────────────────────────────────

  /**
   * File extension derived from MIME prefix of the ContentType field.
   * Graph sometimes returns "application/pdf\n\nDocument" — we parse the first line only.
   */
  get extension(): string | undefined {
    const ct = this.find("ContentType", "contentType");
    if (!ct) return undefined;
    const mime = ct.split("\n")[0].trim();
    return MIME_TO_EXT[mime];
  }

  // ── Internal ──────────────────────────────────────────────────

  /** Return first matching field value across key name variants */
  private find(...keys: string[]): string | undefined {
    if (!this.raw) return undefined;
    for (const key of keys) {
      if (this.raw[key]) return this.raw[key];
    }
    return undefined;
  }
}

/**
 * Normalize a search hit to ensure name, webUrl, and metadata are accessible on the resource.
 * Uses GraphHitFields to resolve all properties via explicit fallback chains,
 * then writes results back to the resource for downstream code that reads
 * standard properties directly (e.g. resource.name, resource.webUrl).
 */
export function normalizeHit(hit: SearchHit, rootUrl?: string): SearchHit {
  const f = new GraphHitFields(hit, rootUrl);

  if (!hit.resource.webUrl) {
    hit.resource.webUrl = f.webUrl;
  }

  if (!hit.resource.name) {
    hit.resource.name = f.name || "";
  }

  // Fill missing metadata from the fallback chains
  if (!hit.resource.lastModifiedDateTime) {
    hit.resource.lastModifiedDateTime = f.lastModified;
  }
  if (!hit.resource.createdDateTime) {
    hit.resource.createdDateTime = f.created;
  }
  if (!hit.resource.size) {
    hit.resource.size = f.size;
  }
  if (!hit.resource.lastModifiedBy?.user?.displayName) {
    const author = f.author;
    if (author) {
      hit.resource.lastModifiedBy = { user: { displayName: author } };
    }
  }

  // Ensure listItem.fields is populated for downstream code
  if (!hit.resource.listItem && f.raw) {
    hit.resource.listItem = { fields: f.raw };
  } else if (hit.resource.listItem && f.raw) {
    hit.resource.listItem.fields = f.raw;
  }

  return hit;
}
