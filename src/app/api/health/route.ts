import { NextResponse } from "next/server";

/** GET /api/health — public health check endpoint. No auth required. */
export async function GET() {
  const checks: Record<string, "ok" | "missing" | "error"> = {
    database: "missing",
    azureClientId: "missing",
    anthropicKey: "missing",
  };

  // Check env var presence
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    checks.database = "ok";
  }
  if (process.env.NEXT_PUBLIC_AZURE_CLIENT_ID) {
    checks.azureClientId = "ok";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    checks.anthropicKey = "ok";
  }

  // Check DB connectivity
  if (checks.database === "ok") {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.tenant.count();
    } catch {
      checks.database = "error";
    }
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    checks,
  });
}
