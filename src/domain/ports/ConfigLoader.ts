/**
 * Port: Config Loader
 *
 * Loads the .viper.yml config for a given project/branch.
 */

export interface ViperReviewConfig {
  style: {
    tone: "strict" | "friendly" | "concise";
    focus: string[];
    language: string;
  };
  rules: string[];
  ignore: string[];
  maxComments: number;
  autoResolve: boolean;
}

export interface ConfigLoader {
  load(projectId: number, ref: string): Promise<ViperReviewConfig>;
}
