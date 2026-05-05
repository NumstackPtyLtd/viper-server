import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  WEBHOOK_SECRET: z.string().min(1, "WEBHOOK_SECRET is required"),
  DATABASE_PATH: z.string().default("./data/viper.db"),
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
