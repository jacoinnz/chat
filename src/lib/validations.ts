import { z } from "zod";
import { NextResponse } from "next/server";

// ── Reusable primitives ──────────────────────────────────────────────

/** Trimmed, non-empty string with max length. */
const safeString = (maxLen = 200) =>
  z.string().trim().min(1, "Must not be empty").max(maxLen);

/** Array of safe strings with bounds. */
const safeStringArray = (maxItems = 50, maxLen = 200) =>
  z.array(safeString(maxLen)).min(1, "Must have at least 1 item").max(maxItems);

/**
 * SharePoint managed property name.
 * Must start with a letter, followed by letters/digits/underscores.
 * Max 64 chars. Blocks all KQL-significant characters (quotes, colons, parens, brackets, *).
 */
const sharePointProperty = z
  .string()
  .regex(
    /^[A-Za-z][A-Za-z0-9_]{0,63}$/,
    "Must be a valid SharePoint property name (letters, digits, underscores; starts with a letter; max 64 chars)"
  );

// ── Section schemas ──────────────────────────────────────────────────

export const taxonomySchema = z.object({
  department: safeStringArray(50, 100),
  sensitivity: safeStringArray(50, 100),
  status: safeStringArray(50, 100),
});

export const contentTypesSchema = safeStringArray(50, 100);

export const keywordsSchema = z
  .array(
    z.object({
      term: safeString(100),
      synonyms: z.array(safeString(100)).max(20),
    })
  )
  .min(1, "Must have at least 1 keyword group")
  .max(100);

export const reviewPoliciesSchema = z
  .array(
    z
      .object({
        contentType: safeString(100),
        maxAgeDays: z.number().int().min(1).max(3650),
        warningDays: z.number().int().min(0).max(365),
      })
      .refine((p) => p.warningDays <= p.maxAgeDays, {
        message: "warningDays must not exceed maxAgeDays",
        path: ["warningDays"],
      })
  )
  .min(1, "Must have at least 1 policy")
  .max(50);

export const searchBehaviourSchema = z
  .object({
    approvedOnly: z.boolean(),
    hideRestricted: z.boolean(),
    maxResults: z.number().int().min(5).max(50),
    recencyBoostDays: z.number().int().min(7).max(365),
    recencyWeight: z.number().min(0).max(5),
    matchWeight: z.number().min(0).max(5),
    freshnessWeight: z.number().min(0).max(5),
  })
  .refine(
    (s) => s.recencyWeight + s.matchWeight + s.freshnessWeight <= 15,
    { message: "Total weight (recency + match + freshness) must not exceed 15" }
  );

export const kqlPropertyMapSchema = z
  .record(safeString(100), sharePointProperty)
  .refine((m) => {
    const count = Object.keys(m).length;
    return count >= 1 && count <= 20;
  }, "Must have between 1 and 20 property mappings");

export const searchFieldsSchema = z
  .array(sharePointProperty)
  .min(1, "Must have at least 1 search field")
  .max(30);

// ── Route-level wrapper schemas ──────────────────────────────────────

export const taxonomyPatchSchema = z.object({ taxonomy: taxonomySchema });

export const contentTypesPatchSchema = z.object({ contentTypes: contentTypesSchema });

export const keywordsPatchSchema = z.object({ keywords: keywordsSchema });

export const reviewPoliciesPatchSchema = z.object({ reviewPolicies: reviewPoliciesSchema });

export const searchBehaviourPatchSchema = z.object({ searchBehaviour: searchBehaviourSchema });

export const kqlPropertyMapPatchSchema = z.object({ kqlPropertyMap: kqlPropertyMapSchema });

export const searchFieldsPatchSchema = z.object({ searchFields: searchFieldsSchema });

export const validatePropertiesSchema = z.object({
  properties: z.array(sharePointProperty).min(1).max(50),
});

export const fullConfigSchema = z.object({
  taxonomy: taxonomySchema,
  contentTypes: contentTypesSchema,
  kqlPropertyMap: kqlPropertyMapSchema,
  searchFields: searchFieldsSchema,
  keywords: keywordsSchema.optional(),
  reviewPolicies: reviewPoliciesSchema.optional(),
  searchBehaviour: searchBehaviourSchema.optional(),
});

export const draftPostSchema = z.object({
  snapshot: z.object({
    taxonomy: taxonomySchema,
    contentTypes: contentTypesSchema,
    kqlPropertyMap: kqlPropertyMapSchema,
    searchFields: searchFieldsSchema,
    keywords: keywordsSchema,
    reviewPolicies: reviewPoliciesSchema,
    searchBehaviour: searchBehaviourSchema,
  }),
  comment: z.string().max(500).optional(),
});

export const resetSchema = z.object({ confirm: z.literal(true) });

export const featureFlagToggleSchema = z.object({
  name: safeString(100),
  enabled: z.boolean(),
  description: z.string().max(500).optional(),
});

export const roleAssignSchema = z.object({
  userHash: z.string().length(64),
  role: z.enum(["platform_admin", "config_admin", "auditor", "viewer"]),
});

export const roleDeleteSchema = z.object({
  userHash: z.string().length(64),
});

export const feedbackSchema = z.object({
  messageId: safeString(200),
  feedbackType: z.enum(["thumbs_up", "thumbs_down", "report"]),
  comment: z.string().max(1000).optional(),
});

export const configImportSchema = z.object({
  config: fullConfigSchema,
  comment: z.string().max(500).optional(),
});

// ── AI Provider schemas ─────────────────────────────────────────────

export const aiProviderPatchSchema = z.object({
  provider: z.enum(["anthropic", "openai", "azure_openai"]).optional(),
  modelId: z.string().min(1).max(200).optional(),
  keySource: z.enum(["platform", "keyvault"]).optional(),
  apiKey: z.string().max(500).optional(),
  keyVaultUrl: z.string().url().optional().or(z.literal("")),
  keyVaultSecret: z.string().max(200).optional(),
  azureEndpoint: z.string().url().optional().or(z.literal("")),
  azureDeployment: z.string().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(100).max(8192).optional(),
  enabled: z.boolean().optional(),
});

// ── User data schemas ────────────────────────────────────────────────

export const savedQueryCreateSchema = z.object({
  title: safeString(100),
  query: safeString(200),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export const savedQueryDeleteSchema = z.object({
  id: safeString(50),
});

export const favoriteCreateSchema = z.object({
  documentUrl: z.string().url().max(2000),
  title: safeString(200),
  siteName: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const favoriteDeleteSchema = z.object({
  documentUrl: z.string().url().max(2000),
});

// ── Helper ───────────────────────────────────────────────────────────

type ValidationSuccess<T> = { success: true; data: T };
type ValidationFailure = { success: false; response: NextResponse };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    response: NextResponse.json(
      {
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    ),
  };
}
