import type { PluginRegistry } from '../../application/ports/PluginRegistry.js'

/**
 * Concrete plugin registry. Singleton per plugin type.
 * Plugins call register() at module load time.
 */
export class Registry<T extends { type: string; name: string; description: string }>
  implements PluginRegistry<T>
{
  private readonly plugins = new Map<string, T>()

  constructor(private readonly label: string) {}

  register(plugin: T): void {
    this.plugins.set(plugin.type, plugin)
  }

  get(type: string): T {
    const plugin = this.plugins.get(type)
    if (!plugin) {
      const available = Array.from(this.plugins.keys()).join(', ')
      throw new Error(
        `Unknown ${this.label} type: "${type}". Available: ${available || 'none registered'}`
      )
    }
    return plugin
  }

  list(): T[] {
    return Array.from(this.plugins.values())
  }

  schemas(): Array<{ type: string; name: string; description: string }> {
    return this.list().map((p) => ({
      type: p.type,
      name: p.name,
      description: p.description,
    }))
  }
}
