// ═══════════════════════════════════════════════════════════════════════
// ADMIN AUTH UTILITIES
// ═══════════════════════════════════════════════════════════════════════
// Server-side helpers for extracting tenant info from JWTs and
// verifying Azure AD admin directory roles via Graph API.

const ADMIN_ROLE_TEMPLATES = [
  "62e90394-69f5-4237-9190-012177145e10", // Global Administrator
  "f28a1f94-e044-4c59-956a-681e95fa6d63", // SharePoint Administrator
];

interface JwtPayload {
  tid?: string; // tenant ID
  oid?: string; // user object ID
  [key: string]: unknown;
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
