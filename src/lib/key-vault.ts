import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import { TtlCache } from "@/lib/config-cache";

// Cache Key Vault secrets for 5 minutes
const vaultCache = new TtlCache<string>(5 * 60 * 1000);

/** Retrieve a secret from Azure Key Vault by vault URL and secret name.
 *  Results are cached with a 5-minute TTL. */
export async function getKeyVaultSecret(
  vaultUrl: string,
  secretName: string
): Promise<string> {
  const cacheKey = `${vaultUrl}/${secretName}`;
  const cached = vaultCache.get(cacheKey);
  if (cached) return cached;

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUrl, credential);

  const secret = await client.getSecret(secretName);
  if (!secret.value) {
    throw new Error(`Key Vault secret "${secretName}" in ${vaultUrl} has no value`);
  }

  vaultCache.set(cacheKey, secret.value);
  return secret.value;
}
