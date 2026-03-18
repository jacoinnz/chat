import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Decode base64url string (JWT uses base64url, not standard base64). */
function decodeBase64Url(str: string): string {
  // Replace base64url chars with standard base64
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad to multiple of 4
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/** Lightweight edge middleware for admin and tenant API routes.
 *  Extracts tenant ID and user ID from the Bearer JWT and forwards
 *  them as request headers. Full admin role verification happens in route handlers. */
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

    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const tenantId = payload.tid;
    const userId = payload.oid;
    const userName = payload.name || "";

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Token missing required claims" },
        { status: 401 }
      );
    }

    // Forward extracted claims as request headers for route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", tenantId);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-name", userName);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/tenant-config", "/api/usage", "/api/feedback", "/api/saved-queries", "/api/favorites", "/api/recent-searches"],
};
