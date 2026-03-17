// ═══════════════════════════════════════════════════════════════════════
// ADMIN AUTH UTILITIES
// ═══════════════════════════════════════════════════════════════════════
// Server-side helpers for extracting tenant info from JWTs and
// verifying Azure AD admin directory roles via Graph API.

import { NextResponse } from "next/server";

const ADMIN_ROLE_TEMPLATES = [
  "62e90394-69f5-4237-9190-012177145e10", // Global Administrator
  "f28a1f94-e044-4c59-956a-681e95fa6d63", // SharePoint Administrator
];

interface JwtPayload {
  tid?: string; // tenant ID
  oid?: string; // user object ID
  [key: string]: unknown;
}

export interface AdminInfo {
  tenantId: string;
  userId: string;
  userName: string;
}

/** Decode the payload of a JWT without cryptographic verification.
 *  Microsoft-issued tokens are verified by Graph API on use. */
function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = parts[1];
  const json = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(json);
}

/** Compute SHA-256 hash of a string (for anonymising user OIDs). */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface TenantInfo {
  tenantId: string;
  userId: string;
  userHash: string;
}

/** Extract tenant ID, user ID, and hashed user ID from a Bearer token. */
export async function extractTenantInfo(
  request: Request
): Promise<TenantInfo | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.slice(7);
    const payload = decodeJwtPayload(token);
    if (!payload.tid || !payload.oid) return null;

    const userHash = await sha256(payload.oid);
    return {
      tenantId: payload.tid,
      userId: payload.oid,
      userHash,
    };
  } catch {
    return null;
  }
}

/** Verify the caller has Global Admin or SharePoint Admin role.
 *  Calls Graph API /me/memberOf with the provided access token. */
/** Fire-and-forget audit log entry. Non-blocking — failures silently ignored. */
export function logAudit(
  tenantId: string,
  userOid: string,
  action: "update" | "reset",
  section: string,
  details?: string
): void {
  // Lazy import to avoid circular dependency at module level
  import("@/lib/prisma").then(async ({ prisma }) => {
    try {
      const userHash = await sha256(userOid);
      await prisma.auditLog.create({
        data: { id: crypto.randomUUID(), tenantId, userHash, action, section, details },
      });
    } catch {
      // Best-effort — audit logging should never break the request
    }
  });
}

/** Verify the caller has Global Admin or SharePoint Admin role.
 *  Calls Graph API /me/memberOf with the provided access token. */
export async function verifyAdminRole(
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/memberOf",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    const roles: Array<{ "@odata.type": string; roleTemplateId?: string }> =
      data.value || [];

    return roles.some(
      (role) =>
        role["@odata.type"] === "#microsoft.graph.directoryRole" &&
        role.roleTemplateId &&
        ADMIN_ROLE_TEMPLATES.includes(role.roleTemplateId)
    );
  } catch {
    return false;
  }
}

/** Shared admin auth check — replaces the 12-line boilerplate in each route.
 *  Returns AdminInfo on success or a NextResponse error to return directly. */
export async function checkAdmin(
  request: Request
): Promise<AdminInfo | NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const isAdmin = await verifyAdminRole(token);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

  const userId = request.headers.get("x-user-id") || "";
  const userName = request.headers.get("x-user-name") || "";

  return { tenantId, userId, userName };
}

/** Build a full config snapshot from the current TenantConfig row. */
function configToSnapshot(config: {
  taxonomy: unknown;
  contentTypes: unknown;
  kqlPropertyMap: unknown;
  searchFields: unknown;
  keywords: unknown;
  reviewPolicies: unknown;
  searchBehaviour: unknown;
}): Record<string, unknown> {
  return {
    taxonomy: config.taxonomy,
    contentTypes: config.contentTypes,
    kqlPropertyMap: config.kqlPropertyMap,
    searchFields: config.searchFields,
    keywords: config.keywords,
    reviewPolicies: config.reviewPolicies,
    searchBehaviour: config.searchBehaviour,
  };
}

/** Create a ConfigVersion row after a config save. Fire-and-forget — never breaks the save.
 *  Returns the version number on success, null on failure. */
export async function createConfigVersion(
  tenantId: string,
  request: Request,
  section: string,
  status: "published" | "draft" = "published",
  comment?: string,
  snapshotOverride?: Record<string, unknown>
): Promise<{ version: number } | null> {
  try {
    const { prisma } = await import("@/lib/prisma");

    // Build snapshot: use override for drafts, or read current config
    let snapshot: Record<string, unknown>;
    if (snapshotOverride) {
      snapshot = snapshotOverride;
    } else {
      const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
      if (!config) return null;
      snapshot = configToSnapshot(config);
    }

    // Determine next version number
    const latest = await prisma.configVersion.findFirst({
      where: { tenantId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const userOid = request.headers.get("x-user-id") || "";
    const userName = request.headers.get("x-user-name") || "";
    const authorHash = await sha256(userOid);

    await prisma.configVersion.create({
      data: {
        tenantId,
        version: nextVersion,
        status,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        section,
        authorHash,
        authorName: userName,
        comment,
        publishedAt: status === "published" ? new Date() : null,
      },
    });

    return { version: nextVersion };
  } catch {
    // Best-effort — versioning should never break the save
    return null;
  }
}
