import { NextResponse } from "next/server";
import { verifyAdminRole } from "@/lib/admin-auth";

const ADMIN_ROLE_TEMPLATES: Record<string, string> = {
  "62e90394-69f5-4237-9190-012177145e10": "Global Administrator",
  "f28a1f94-e044-4c59-956a-681e95fa6d63": "SharePoint Administrator",
};

/** GET /api/admin/tenant-info — tenant metadata, admin role counts, system status. */
export async function GET(request: Request) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const isAdmin = await verifyAdminRole(accessToken);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Collect data from independent sources; each section is safe ---

  // 1. Database — fetch tenant record (graceful on failure)
  let tenant: { name: string; createdAt: Date; config: { updatedAt: Date } | null } | null = null;
  let dbStatus: "operational" | "error" | "not_configured" = "not_configured";
  try {
    const { prisma } = await import("@/lib/prisma");
    tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      include: { config: { select: { updatedAt: true } } },
    });
    dbStatus = "operational";
  } catch (dbErr) {
    console.error("[tenant-info] DB error:", dbErr);
    dbStatus = "error";
  }

  // 2. Organisation display name from Graph API
  let orgName = tenant?.name || "";
  let consentStatus = "unknown";
  try {
    const orgRes = await fetch("https://graph.microsoft.com/v1.0/organization", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      const org = orgData.value?.[0];
      if (org) {
        orgName = org.displayName || orgName;
        consentStatus = "granted";
      }
    }
  } catch {
    // Graph call failed — use stored name
  }

  // 3. Persist org name if we got a fresh one (fire-and-forget)
  if (orgName && tenant && tenant.name !== orgName && dbStatus === "operational") {
    import("@/lib/prisma").then(({ prisma }) =>
      prisma.tenant.update({ where: { tenantId }, data: { name: orgName } }).catch(() => {})
    );
  }

  // 4. Admin role counts from Graph API /directoryRoles
  const roleCounts: Record<string, number> = {};
  try {
    const rolesRes = await fetch(
      "https://graph.microsoft.com/v1.0/directoryRoles?$expand=members($select=id)&$select=roleTemplateId,displayName",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (rolesRes.ok) {
      const rolesData = await rolesRes.json();
      for (const role of rolesData.value || []) {
        const templateId = role.roleTemplateId as string;
        if (ADMIN_ROLE_TEMPLATES[templateId]) {
          roleCounts[ADMIN_ROLE_TEMPLATES[templateId]] = (role.members || []).length;
        }
      }
    }
  } catch {
    // Role count fetch failed — return empty
  }

  // 5. System status
  const systemStatus = {
    database: dbStatus as string,
    searchApi: "unknown" as string,
    graphApi: "unknown" as string,
    aiService: "unknown" as string,
  };

  try {
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=id", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    systemStatus.graphApi = meRes.ok ? "operational" : "error";
    systemStatus.searchApi = meRes.ok ? "operational" : "unknown";
  } catch {
    systemStatus.graphApi = "error";
  }

  systemStatus.aiService = process.env.ANTHROPIC_API_KEY ? "operational" : "not_configured";

  return NextResponse.json({
    tenantId,
    tenantName: orgName,
    consentStatus,
    configuredAt: tenant?.createdAt || null,
    lastConfigUpdate: tenant?.config?.updatedAt || null,
    adminRoles: roleCounts,
    systemStatus,
    version: {
      app: process.env.npm_package_version || "1.0.0",
      schema: "1.1.0",
    },
  });
}
