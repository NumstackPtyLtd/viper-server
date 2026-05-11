/**
 * Port: Settings Repository
 *
 * Key-value store for provider configuration.
 * Provider type, API keys, URLs, models. All stored here, never in env vars.
 */
export interface SettingsRepository {
  get(key: string): string | null
  getMany(keys: string[]): Record<string, string>
  set(key: string, value: string, isSecret?: boolean): void
  delete(key: string): void
  all(): Array<{ key: string; value: string; isSecret: boolean }>
}
