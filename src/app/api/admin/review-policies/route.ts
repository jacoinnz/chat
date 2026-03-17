import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";

/** PATCH /api/admin/review-policies — update document review policies. */
export async function PATCH(request: Request) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await verifyAdminRole(authHeader.replace("Bearer ", ""));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { reviewPolicies } = body;

    if (!Array.isArray(reviewPolicies)) {
      return NextResponse.json({ error: "reviewPolicies must be an array" }, { status: 400 });
    }

    // Validate structure
    for (const policy of reviewPolicies) {
      if (typeof policy.contentType !== "string" || !policy.contentType.trim()) {
        return NextResponse.json({ error: "Each policy must have a non-empty contentType" }, { status: 400 });
      }
      if (typeof policy.maxAgeDays !== "number" || policy.maxAgeDays < 1) {
        return NextResponse.json({ error: "maxAgeDays must be a positive number" }, { status: 400 });
      }
      if (typeof policy.warningDays !== "number" || policy.warningDays < 0) {
        return NextResponse.json({ error: "warningDays must be a non-negative number" }, { status: 400 });
      }
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { reviewPolicies },
    });

    const userId = request.headers.get("x-user-id") || "";
    logAudit(tenantId, userId, "update", "review-policies", `Updated review policies (${reviewPolicies.length} rules)`);

    return NextResponse.json({ reviewPolicies: config.reviewPolicies });
  } catch {
    return NextResponse.json({ error: "Failed to update review policies" }, { status: 500 });
  }
}
