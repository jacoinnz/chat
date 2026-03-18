import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin-auth";

/** GET /api/admin/onboarding — run readiness checks for tenant setup. */
export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const checks: Record<string, { passed: boolean; message: string }> = {};

  // 1. Graph API access — verify token works
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  try {
    const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    checks.graphApi = {
      passed: graphRes.ok,
      message: graphRes.ok
        ? "Graph API access verified"
        : `Graph API returned ${graphRes.status}`,
    };
  } catch {
    checks.graphApi = { passed: false, message: "Graph API unreachable" };
  }

  // 2. SharePoint search access
  try {
    const searchRes = await fetch(
      "https://graph.microsoft.com/v1.0/search/query",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              entityTypes: ["driveItem"],
              query: { queryString: "test" },
              from: 0,
              size: 1,
            },
          ],
        }),
      }
    );
    checks.sharePointSearch = {
      passed: searchRes.ok,
      message: searchRes.ok
        ? "SharePoint search access verified"
        : `SharePoint search returned ${searchRes.status}`,
    };
  } catch {
    checks.sharePointSearch = { passed: false, message: "SharePoint search unreachable" };
  }

  // 3. AI service — check ANTHROPIC_API_KEY is set
  checks.aiService = {
    passed: !!process.env.ANTHROPIC_API_KEY,
    message: process.env.ANTHROPIC_API_KEY
      ? "AI service API key configured"
      : "ANTHROPIC_API_KEY not set",
  };

  // 4. Config exists
  const config = await prisma.tenantConfig.findUnique({
    where: { tenantId: auth.tenantId },
  });
  checks.configExists = {
    passed: !!config,
    message: config
      ? "Tenant configuration exists"
      : "No configuration found — defaults will be used",
  };

  const allPassed = Object.values(checks).every((c) => c.passed);

  // Auto-update onboarding status
  if (allPassed) {
    try {
      await prisma.tenant.update({
        where: { tenantId: auth.tenantId },
        data: { onboardingStatus: "setup_complete" },
      });
    } catch {
      // Best-effort
    }
  }

  // Get current status
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId: auth.tenantId },
    select: { onboardingStatus: true },
  });

  return NextResponse.json({
    onboardingStatus: tenant?.onboardingStatus ?? "setup_pending",
    checks,
    allPassed,
  });
}
