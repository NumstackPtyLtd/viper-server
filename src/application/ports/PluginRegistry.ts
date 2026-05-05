/**
 * Port: Plugin Registry
 *
 * Generic registry for plugins (VCS, AI, etc.).
 * Plugins self-register. The container resolves by type.
 */
export interface PluginRegistry<T extends { type: string; name: string; description: string }> {
  register(plugin: T): void
  get(type: string): T
  list(): T[]
  schemas(): Array<{ type: string; name: string; description: string }>
}
