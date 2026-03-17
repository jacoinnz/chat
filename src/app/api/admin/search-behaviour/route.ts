import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRole, logAudit } from "@/lib/admin-auth";

const ALLOWED_KEYS = new Set([
  "approvedOnly",
  "hideRestricted",
  "maxResults",
  "recencyBoostDays",
  "recencyWeight",
  "matchWeight",
  "freshnessWeight",
]);

/** PATCH /api/admin/search-behaviour — update search behaviour settings. */
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
    const { searchBehaviour } = body;

    if (!searchBehaviour || typeof searchBehaviour !== "object") {
      return NextResponse.json({ error: "searchBehaviour must be an object" }, { status: 400 });
    }

    // Only allow known keys — prevent arbitrary config injection
    for (const key of Object.keys(searchBehaviour)) {
      if (!ALLOWED_KEYS.has(key)) {
        return NextResponse.json({ error: `Unknown key: ${key}` }, { status: 400 });
      }
    }

    // Validate ranges
    if (searchBehaviour.maxResults !== undefined) {
      const v = searchBehaviour.maxResults;
      if (typeof v !== "number" || v < 5 || v > 50) {
        return NextResponse.json({ error: "maxResults must be between 5 and 50" }, { status: 400 });
      }
    }
    if (searchBehaviour.recencyBoostDays !== undefined) {
      const v = searchBehaviour.recencyBoostDays;
      if (typeof v !== "number" || v < 7 || v > 365) {
        return NextResponse.json({ error: "recencyBoostDays must be between 7 and 365" }, { status: 400 });
      }
    }
    for (const weightKey of ["recencyWeight", "matchWeight", "freshnessWeight"] as const) {
      if (searchBehaviour[weightKey] !== undefined) {
        const v = searchBehaviour[weightKey];
        if (typeof v !== "number" || v < 0 || v > 5) {
          return NextResponse.json({ error: `${weightKey} must be between 0 and 5` }, { status: 400 });
        }
      }
    }

    const config = await prisma.tenantConfig.update({
      where: { tenantId },
      data: { searchBehaviour },
    });

    const userId = request.headers.get("x-user-id") || "";
    const changedKeys = Object.keys(searchBehaviour).join(", ");
    logAudit(tenantId, userId, "update", "search-behaviour", `Updated search behaviour: ${changedKeys}`);

    return NextResponse.json({ searchBehaviour: config.searchBehaviour });
  } catch {
    return NextResponse.json({ error: "Failed to update search behaviour" }, { status: 500 });
  }
}
