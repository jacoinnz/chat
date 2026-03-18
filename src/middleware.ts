import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Lightweight edge middleware for admin and tenant API routes.
 *  Extracts tenant ID and user ID from the Bearer JWT and forwards
 *  them as headers. Full admin role verification happens in route handlers. */
export function middleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  try {
    // Decode JWT payload (no cryptographic verification — Microsoft-issued)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const payload = JSON.parse(atob(parts[1]));
    const tenantId = payload.tid;
    const userId = payload.oid;
    const userName = payload.name || "";

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Token missing required claims" },
        { status: 401 }
      );
    }

    // Forward extracted claims as headers for route handlers
    const response = NextResponse.next();
    response.headers.set("x-tenant-id", tenantId);
    response.headers.set("x-user-id", userId);
    response.headers.set("x-user-name", userName);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/tenant-config", "/api/usage", "/api/feedback"],
};
