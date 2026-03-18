import { z } from "zod";

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL is required"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
  ANTHROPIC_API_KEY: z.string().optional(), // Optional — AI summary disabled when absent
  NEXT_PUBLIC_AZURE_CLIENT_ID: z.string().min(1, "NEXT_PUBLIC_AZURE_CLIENT_ID is required"),
  CRON_SECRET: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let validated = false;

/** Validate all required environment variables. Logs warnings on missing vars.
 *  Never throws — validation is advisory to avoid breaking builds and SSG. */
export function validateEnv(): ValidatedEnv {
  if (validated) return process.env as unknown as ValidatedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env-validation] Missing required environment variables:\n${missing}`);
  }

  validated = true;
  return result.success ? result.data : (process.env as unknown as ValidatedEnv);
}
