import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Provider selection
  VCS_PROVIDER: z.string().min(1, "VCS_PROVIDER is required"),
  AI_PROVIDER: z.string().min(1, "AI_PROVIDER is required"),

  // VCS config (provider-agnostic)
  VCS_URL: z.string().min(1, "VCS_URL is required"),
  VCS_TOKEN: z.string().min(1, "VCS_TOKEN is required"),
  WEBHOOK_SECRET: z.string().min(1, "WEBHOOK_SECRET is required"),

  // AI config (provider-agnostic)
  AI_API_KEY: z.string().min(1, "AI_API_KEY is required"),
  AI_MODEL: z.string().optional(),

  // Optional
  BOT_USER_ID: z.coerce.number().optional(),
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
