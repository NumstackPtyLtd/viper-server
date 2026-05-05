import type { AiReviewer } from '../../domain/ports/AiReviewer.js'
import type { ConfigField } from './VcsPlugin.js'

export interface AiPluginConfig {
  apiKey: string
  model?: string
}

export interface AiModel {
  id: string
  label: string
  default?: boolean
}

/**
 * Port: AI Plugin
 *
 * Combines the AiReviewer port with metadata, model listing,
 * and factory methods. Each AI adapter (Claude, OpenAI, etc.)
 * implements this interface and self-registers in the AiRegistry.
 */
export interface AiPlugin {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly configSchema: ConfigField[]
  readonly models: AiModel[]

  /** Create an AiReviewer instance from config */
  createReviewer(config: AiPluginConfig): AiReviewer
}
