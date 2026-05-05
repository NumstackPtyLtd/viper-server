import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  GITLAB_URL: z.string().default("https://gitlab.com"),
  GITLAB_TOKEN: z.string().min(1, "GITLAB_TOKEN is required"),
  GITLAB_WEBHOOK_SECRET: z.string().min(1, "GITLAB_WEBHOOK_SECRET is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  BOT_USER_ID: z.coerce.number().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cached: EnvConfig | null = null;

export function loadEnvConfig(): EnvConfig {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n  ${issues.join("\n  ")}`);
  }

  cached = result.data;
  return cached;
}
