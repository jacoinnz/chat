import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "critical";
  latencyMs: number;
  message: string;
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = performance.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.tenant.count();
    const latencyMs = Math.round(performance.now() - start);
    return {
      name: "Database",
      status: latencyMs > 2000 ? "degraded" : "healthy",
      latencyMs,
      message: latencyMs > 2000 ? "High latency" : "Connected",
    };
  } catch (e) {
    return {
      name: "Database",
      status: "critical",
      latencyMs: Math.round(performance.now() - start),
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
}

async function checkAzureAD(token: string): Promise<ServiceCheck> {
  const start = performance.now();
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const latencyMs = Math.round(performance.now() - start);
    if (response.ok) {
      return { name: "Azure AD", status: "healthy", latencyMs, message: "Authenticated" };
    }
    return {
      name: "Azure AD",
      status: response.status === 401 ? "critical" : "degraded",
      latencyMs,
      message: `HTTP ${response.status}`,
    };
  } catch {
    return {
      name: "Azure AD",
      status: "critical",
      latencyMs: Math.round(performance.now() - start),
      message: "Unreachable",
    };
  }
}

async function checkAIProvider(): Promise<ServiceCheck> {
  const start = performance.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { name: "AI Provider", status: "critical", latencyMs: 0, message: "API key not configured" };
  }
  try {
    // Lightweight check — just hit the models endpoint
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    const latencyMs = Math.round(performance.now() - start);
    if (response.ok) {
      return { name: "AI Provider", status: "healthy", latencyMs, message: "Connected" };
    }
    return {
      name: "AI Provider",
      status: response.status === 401 ? "critical" : "degraded",
      latencyMs,
      message: `HTTP ${response.status}`,
    };
  } catch {
    return {
      name: "AI Provider",
      status: "critical",
      latencyMs: Math.round(performance.now() - start),
      message: "Unreachable",
    };
  }
}

async function checkGraphAPI(token: string): Promise<ServiceCheck> {
  const start = performance.now();
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/drive", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const latencyMs = Math.round(performance.now() - start);
    if (response.ok) {
      return { name: "Graph API", status: "healthy", latencyMs, message: "Connected" };
    }
    return {
      name: "Graph API",
      status: response.status === 401 ? "degraded" : "degraded",
      latencyMs,
      message: `HTTP ${response.status}`,
    };
  } catch {
    return {
      name: "Graph API",
      status: "critical",
      latencyMs: Math.round(performance.now() - start),
      message: "Unreachable",
    };
  }
}

export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";

  const [db, azureAd, ai, graph] = await Promise.all([
    checkDatabase(),
    checkAzureAD(token),
    checkAIProvider(),
    checkGraphAPI(token),
  ]);

  const services = [db, azureAd, ai, graph];
  const hasCritical = services.some((s) => s.status === "critical");
  const hasDegraded = services.some((s) => s.status === "degraded");
  const overall = hasCritical ? "critical" : hasDegraded ? "degraded" : "healthy";

  return NextResponse.json({ overall, services, checkedAt: new Date().toISOString() });
}
