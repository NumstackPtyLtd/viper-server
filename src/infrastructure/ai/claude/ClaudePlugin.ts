import type { AiPlugin, AiPluginConfig, AiModel } from '../../../application/ports/AiPlugin.js'
import type { ConfigField } from '../../../application/ports/VcsPlugin.js'
import type { AiReviewer } from '../../../domain/ports/AiReviewer.js'
import { ClaudeAiReviewer } from './ClaudeAiReviewer.js'

export class ClaudePlugin implements AiPlugin {
  readonly type = 'claude'
  readonly name = 'Anthropic Claude'
  readonly description = 'Claude AI models by Anthropic'

  readonly configSchema: ConfigField[] = [
    { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-xxxxxxxxxxxxxxxxxxxx' },
    { name: 'model', label: 'Model', type: 'text', required: false, placeholder: 'claude-sonnet-4-20250514' },
  ]

  readonly models: AiModel[] = [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', default: true },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ]

  createReviewer(config: AiPluginConfig): AiReviewer {
    const model = config.model ?? this.getDefaultModel()
    return new ClaudeAiReviewer(config.apiKey, model)
  }

  private getDefaultModel(): string {
    const defaultModel = this.models.find((m) => m.default)
    return defaultModel?.id ?? this.models[0].id
  }
}
