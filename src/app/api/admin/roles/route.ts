import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, requireRole, logAudit } from "@/lib/admin-auth";
import { roleAssignSchema, roleDeleteSchema, validateBody } from "@/lib/validations";

/** GET /api/admin/roles — list all role assignments for tenant. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "auditor");
  if (roleCheck) return roleCheck;

  const roles = await prisma.adminRole.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      userHash: r.userHash,
      role: r.role,
      assignedBy: r.assignedBy,
      createdAt: r.createdAt,
    })),
  });
}

/** PATCH /api/admin/roles — assign or update a role. */
export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "platform_admin");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const v = validateBody(roleAssignSchema, body);
    if (!v.success) return v.response;

    const { userHash, role } = v.data;

    // Compute assigner's hash
    const encoder = new TextEncoder();
    const data = encoder.encode(auth.userId);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const assignerHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await prisma.adminRole.upsert({
      where: { tenantId_userHash: { tenantId: auth.tenantId, userHash } },
      create: {
        tenantId: auth.tenantId,
        userHash,
        role,
        assignedBy: assignerHash,
      },
      update: { role, assignedBy: assignerHash },
    });

    logAudit(auth.tenantId, auth.userId, "update", "roles", `Assigned ${role} to user ${userHash.slice(0, 8)}...`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 });
  }
}

/** DELETE /api/admin/roles — remove a role assignment. */
export async function DELETE(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "platform_admin");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const v = validateBody(roleDeleteSchema, body);
    if (!v.success) return v.response;

    const { userHash } = v.data;

    await prisma.adminRole.deleteMany({
      where: { tenantId: auth.tenantId, userHash },
    });

    logAudit(auth.tenantId, auth.userId, "update", "roles", `Removed role for user ${userHash.slice(0, 8)}...`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove role" }, { status: 500 });
  }
}
