import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  try {
    // Fetch tenant record
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      include: { config: { select: { updatedAt: true } } },
    });

    // Fetch organisation display name from Graph API
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

    // Persist org name if we got a fresh one
    if (orgName && tenant && tenant.name !== orgName) {
      await prisma.tenant.update({
        where: { tenantId },
        data: { name: orgName },
      }).catch(() => {});
    }

    // Fetch admin role counts from Graph API /directoryRoles
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

    // System status checks
    const systemStatus = {
      database: "operational" as const,
      searchApi: "unknown" as string,
      graphApi: "unknown" as string,
      aiService: "unknown" as string,
    };

    // DB is operational if we got this far
    // Check Graph API via a lightweight call
    try {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=id", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      systemStatus.graphApi = meRes.ok ? "operational" : "error";
      // If Graph works, Search API is likely operational too
      systemStatus.searchApi = meRes.ok ? "operational" : "unknown";
    } catch {
      systemStatus.graphApi = "error";
    }

    // Check AI service by verifying the env var exists (no actual call)
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
        schema: "1.1.0", // Bumped for AuditLog addition
      },
    });
  } catch (err) {
    console.error("[tenant-info] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tenant info", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
