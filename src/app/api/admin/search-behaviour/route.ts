import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin, logAudit, createConfigVersion } from "@/lib/admin-auth";

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
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = auth;

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

    const changedKeys = Object.keys(searchBehaviour).join(", ");
    logAudit(tenantId, userId, "update", "search-behaviour", `Updated search behaviour: ${changedKeys}`);
    createConfigVersion(tenantId, request, "search-behaviour");

    return NextResponse.json({ searchBehaviour: config.searchBehaviour });
  } catch {
    return NextResponse.json({ error: "Failed to update search behaviour" }, { status: 500 });
  }
}
