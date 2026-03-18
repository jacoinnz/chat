import { NextResponse } from "next/server";
import { checkAdmin, requireRole, createConfigVersion } from "@/lib/admin-auth";
import { configImportSchema, validateBody } from "@/lib/validations";

/** POST /api/admin/config/import — import config as a draft. */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const v = validateBody(configImportSchema, body);
    if (!v.success) return v.response;

    const { config, comment } = v.data;

    const snapshot = {
      taxonomy: config.taxonomy,
      contentTypes: config.contentTypes,
      kqlPropertyMap: config.kqlPropertyMap,
      searchFields: config.searchFields,
      keywords: config.keywords,
      reviewPolicies: config.reviewPolicies,
      searchBehaviour: config.searchBehaviour,
    };

    const result = await createConfigVersion(
      auth.tenantId,
      request,
      "import",
      "draft",
      comment ?? "Imported configuration",
      snapshot
    );

    return NextResponse.json({
      success: true,
      version: result?.version ?? null,
      message: "Configuration saved as draft. Review and publish when ready.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to import config" }, { status: 500 });
  }
}
