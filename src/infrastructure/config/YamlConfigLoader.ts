import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { ConfigLoader, ViperReviewConfig } from "../../domain/ports/ConfigLoader.js";
import type { VcsProvider } from "viper-vcs-providers";
import { logger } from "../../shared/logger.js";

const reviewStyleSchema = z.object({
  tone: z.enum(["strict", "friendly", "concise"]).default("friendly"),
  focus: z.array(z.string()).default([]),
  language: z.string().default("English"),
});

const viperConfigSchema = z.object({
  version: z.literal(1).default(1),
  review: z
    .object({
      style: reviewStyleSchema.default({}),
      rules: z.array(z.string()).default([]),
      ignore: z.array(z.string()).default([]),
      max_comments: z.number().min(1).max(50).default(20),
      auto_resolve: z.boolean().default(true),
    })
    .default({}),
});

const DEFAULTS: ViperReviewConfig = {
  style: { tone: "friendly", focus: [], language: "English" },
  rules: [],
  ignore: [],
  maxComments: 20,
  autoResolve: true,
};

export class YamlConfigLoader implements ConfigLoader {
  constructor(private readonly vcs: VcsProvider) {}

  async load(projectId: number, ref: string): Promise<ViperReviewConfig> {
    const content = await this.vcs.getFileContent(projectId, ".viper.yml", ref);

    if (!content) {
      logger.debug({ projectId, ref }, "No .viper.yml found, using defaults");
      return DEFAULTS;
    }

    try {
      const raw = parseYaml(content);
      const parsed = viperConfigSchema.parse(raw ?? {});

      return {
        style: parsed.review.style,
        rules: parsed.review.rules,
        ignore: parsed.review.ignore,
        maxComments: parsed.review.max_comments,
        autoResolve: parsed.review.auto_resolve,
      };
    } catch (err) {
      logger.warn({ err }, "Invalid .viper.yml, using defaults");
      return DEFAULTS;
    }
  }
}
