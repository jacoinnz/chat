import { NextResponse } from "next/server";
import { checkAdmin, requireRole, logAudit, createConfigVersion } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { invalidateAIKeyCache } from "@/lib/ai-key-resolver";
import { validateBody, aiProviderPatchSchema } from "@/lib/validations";
import { DEFAULT_AI_PROVIDER } from "@/lib/taxonomy-defaults";

export async function GET(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  try {
    const config = await prisma.aIProviderConfig.findUnique({
      where: { tenantId: auth.tenantId },
    });

    if (!config) {
      return NextResponse.json({
        config: {
          ...DEFAULT_AI_PROVIDER,
          keySource: "platform",
          keyVaultUrl: "",
          keyVaultSecret: "",
          azureEndpoint: "",
          azureDeployment: "",
        },
        hasKey: false,
      });
    }

    return NextResponse.json({
      config: {
        provider: config.provider,
        modelId: config.modelId,
        keySource: config.keySource,
        keyVaultUrl: config.keyVaultUrl || "",
        keyVaultSecret: config.keyVaultSecret || "",
        azureEndpoint: config.azureEndpoint || "",
        azureDeployment: config.azureDeployment || "",
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        enabled: config.enabled,
      },
      hasKey: !!config.encryptedKey,
    });
  } catch (err) {
    console.error("[ai-providers] GET error:", err);
    return NextResponse.json({ error: "Failed to load AI provider config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await checkAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, "config_admin");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const validation = validateBody(aiProviderPatchSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data;

    // Build the upsert payload
    const updatePayload: Record<string, unknown> = {};

    if (data.provider !== undefined) updatePayload.provider = data.provider;
    if (data.modelId !== undefined) updatePayload.modelId = data.modelId;
    if (data.keySource !== undefined) updatePayload.keySource = data.keySource;
    if (data.keyVaultUrl !== undefined) updatePayload.keyVaultUrl = data.keyVaultUrl || null;
    if (data.keyVaultSecret !== undefined) updatePayload.keyVaultSecret = data.keyVaultSecret || null;
    if (data.azureEndpoint !== undefined) updatePayload.azureEndpoint = data.azureEndpoint || null;
    if (data.azureDeployment !== undefined) updatePayload.azureDeployment = data.azureDeployment || null;
    if (data.temperature !== undefined) updatePayload.temperature = data.temperature;
    if (data.maxTokens !== undefined) updatePayload.maxTokens = data.maxTokens;
    if (data.enabled !== undefined) updatePayload.enabled = data.enabled;

    // Handle API key: encrypt if provided, clear if empty string
    if (data.apiKey !== undefined) {
      if (data.apiKey === "") {
        updatePayload.encryptedKey = null;
      } else {
        updatePayload.encryptedKey = encrypt(data.apiKey);
      }
    }

    await prisma.aIProviderConfig.upsert({
      where: { tenantId: auth.tenantId },
      create: {
        tenantId: auth.tenantId,
        ...updatePayload,
      },
      update: updatePayload,
    });

    // Invalidate cached key
    invalidateAIKeyCache(auth.tenantId);

    // Audit log (never log the key value)
    logAudit(auth.tenantId, auth.userId, "update", "ai-providers", "AI provider config updated");

    // Config version snapshot
    createConfigVersion(auth.tenantId, request, "ai-providers").catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ai-providers] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update AI provider config" }, { status: 500 });
  }
}
