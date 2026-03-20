import { TtlCache } from "@/lib/config-cache";
import { decrypt } from "@/lib/encryption";
import { getKeyVaultSecret } from "@/lib/key-vault";
import { DEFAULT_AI_PROVIDER } from "@/lib/taxonomy-defaults";

export interface ResolvedAIConfig {
  key: string;
  provider: "anthropic" | "openai" | "azure_openai";
  modelId: string;
  temperature: number;
  maxTokens: number;
  azureEndpoint?: string;
  azureDeployment?: string;
}

const aiKeyCache = new TtlCache<ResolvedAIConfig>(5 * 60 * 1000);

/** Resolve the AI API key and configuration for a given tenant.
 *  Falls back to `process.env.ANTHROPIC_API_KEY` if no tenant config exists. */
export async function resolveAIKey(
  tenantId: string
): Promise<ResolvedAIConfig | null> {
  // Check cache first
  const cacheKey = `ai-key:${tenantId}`;
  const cached = aiKeyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { prisma } = await import("@/lib/prisma");
    const config = await prisma.aIProviderConfig.findUnique({
      where: { tenantId },
    });

    // No config or disabled → fall back to env var
    if (!config || !config.enabled) {
      return fallbackToEnv(cacheKey);
    }

    let key: string;

    if (config.keySource === "keyvault") {
      if (!config.keyVaultUrl || !config.keyVaultSecret) {
        return fallbackToEnv(cacheKey);
      }
      key = await getKeyVaultSecret(config.keyVaultUrl, config.keyVaultSecret);
    } else {
      // platform mode — encrypted key in DB
      if (!config.encryptedKey) {
        return fallbackToEnv(cacheKey);
      }
      key = decrypt(config.encryptedKey);
    }

    const resolved: ResolvedAIConfig = {
      key,
      provider: config.provider as ResolvedAIConfig["provider"],
      modelId: config.modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      azureEndpoint: config.azureEndpoint || undefined,
      azureDeployment: config.azureDeployment || undefined,
    };

    aiKeyCache.set(cacheKey, resolved);
    return resolved;
  } catch (err) {
    console.error("[ai-key-resolver] Error resolving key for tenant", tenantId, err);
    return fallbackToEnv(cacheKey);
  }
}

/** Invalidate cached AI key for a tenant (call after config update). */
export function invalidateAIKeyCache(tenantId: string): void {
  aiKeyCache.invalidate(`ai-key:${tenantId}`);
}

function fallbackToEnv(cacheKey: string): ResolvedAIConfig | null {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (!envKey) return null;

  const resolved: ResolvedAIConfig = {
    key: envKey,
    provider: DEFAULT_AI_PROVIDER.provider,
    modelId: DEFAULT_AI_PROVIDER.modelId,
    temperature: DEFAULT_AI_PROVIDER.temperature,
    maxTokens: DEFAULT_AI_PROVIDER.maxTokens,
  };

  aiKeyCache.set(cacheKey, resolved);
  return resolved;
}
