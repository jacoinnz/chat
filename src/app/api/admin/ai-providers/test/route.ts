import { NextResponse } from "next/server";
import { checkAdmin, requireRole } from "@/lib/admin-auth";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const testSchema = z.object({
  provider: z.enum(["anthropic", "openai", "azure_openai"]),
  apiKey: z.string().min(1).optional(),
  keyVaultUrl: z.string().url().optional(),
  keyVaultSecret: z.string().min(1).optional(),
  azureEndpoint: z.string().url().optional(),
  azureDeployment: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const validation = validateBody(testSchema, body);
    if (!validation.success) return validation.response;

    const { provider, apiKey, keyVaultUrl, keyVaultSecret, azureEndpoint, azureDeployment } = validation.data;

    // Resolve the key to test
    let key: string;

    if (keyVaultUrl && keyVaultSecret) {
      const { getKeyVaultSecret } = await import("@/lib/key-vault");
      key = await getKeyVaultSecret(keyVaultUrl, keyVaultSecret);
    } else if (apiKey) {
      key = apiKey;
    } else {
      return NextResponse.json(
        { success: false, error: "No API key or Key Vault configuration provided" },
        { status: 400 }
      );
    }

    // Test connectivity based on provider
    if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json({ success: false, error: `Anthropic API error: ${response.status} — ${err}` });
      }
      return NextResponse.json({ success: true });
    }

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json({ success: false, error: `OpenAI API error: ${response.status} — ${err}` });
      }
      return NextResponse.json({ success: true });
    }

    if (provider === "azure_openai") {
      if (!azureEndpoint || !azureDeployment) {
        return NextResponse.json(
          { success: false, error: "Azure OpenAI requires endpoint and deployment name" },
          { status: 400 }
        );
      }
      const url = `${azureEndpoint.replace(/\/$/, "")}/openai/deployments/${azureDeployment}?api-version=2024-02-01`;
      const response = await fetch(url, {
        headers: { "api-key": key },
      });
      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json({ success: false, error: `Azure OpenAI error: ${response.status} — ${err}` });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection test failed";
    return NextResponse.json({ success: false, error: message });
  }
}
