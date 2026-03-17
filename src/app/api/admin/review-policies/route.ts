import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { reviewPoliciesPatchSchema, validateBody } from "@/lib/validations";

/** PATCH /api/admin/review-policies — update document review policies. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

  try {
    const body = await request.json();
    const v = validateBody(reviewPoliciesPatchSchema, body);
    if (!v.success) return v.response;

    const { reviewPolicies } = v.data;

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { reviewPolicies },
    });

    logAudit(tenantId, userId, "update", "review-policies", `Updated review policies (${reviewPolicies.length} rules)`);
    createConfigVersion(tenantId, request, "review-policies");

    return NextResponse.json({ reviewPolicies: config.reviewPolicies });
  } catch {
    return NextResponse.json({ error: "Failed to update review policies" }, { status: 500 });
  }
}
