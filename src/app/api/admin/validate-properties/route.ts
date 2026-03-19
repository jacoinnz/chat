import { NextResponse } from "next/server";
import { checkAdmin, requireRole } from "@/lib/admin-auth";
import { validatePropertiesSchema, validateBody } from "@/lib/validations";
import { validateProperties } from "@/lib/graph-probe";

/** POST /api/admin/validate-properties — probe which SharePoint properties exist. */
export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const v = validateBody(validatePropertiesSchema, body);
    if (!v.success) return v.response;

    const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const results = await validateProperties(v.data.properties, token);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Property validation failed" },
      { status: 500 }
    );
  }
}
