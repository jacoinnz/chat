import { prisma } from "@/lib/prisma";

export const DEFAULT_FLAGS: Record<string, { enabled: boolean; description: string }> = {
  feedbackLoop: { enabled: false, description: "Show thumbs up/down feedback buttons on AI responses" },
  bulkAdmin: { enabled: false, description: "Enable bulk import/export of tenant configuration" },
  advancedAnalytics: { enabled: false, description: "Enable advanced analytics with daily summaries" },
};

/** Check if a feature flag is enabled for a tenant. Falls back to default. */
export async function isFeatureEnabled(tenantId: string, name: string): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
    if (flag) return flag.enabled;
    return DEFAULT_FLAGS[name]?.enabled ?? false;
  } catch {
    return DEFAULT_FLAGS[name]?.enabled ?? false;
  }
}

/** Get all feature flags for a tenant, merging DB values with defaults. */
export async function getAllFeatureFlags(
  tenantId: string
): Promise<Array<{ name: string; enabled: boolean; description: string }>> {
  try {
    const dbFlags = await prisma.featureFlag.findMany({
      where: { tenantId },
    });
    const dbMap = new Map(dbFlags.map((f) => [f.name, f]));

    return Object.entries(DEFAULT_FLAGS).map(([name, defaults]) => {
      const dbFlag = dbMap.get(name);
      return {
        name,
        enabled: dbFlag ? dbFlag.enabled : defaults.enabled,
        description: dbFlag?.description || defaults.description,
      };
    });
  } catch {
    return Object.entries(DEFAULT_FLAGS).map(([name, defaults]) => ({
      name,
      enabled: defaults.enabled,
      description: defaults.description,
    }));
  }
}
