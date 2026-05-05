import { loadEnvConfig } from './infrastructure/config/EnvConfig.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { NoOpTenantService } from './infrastructure/tenant/NoOpTenantService.js'
import { SqliteSettingsRepository } from './infrastructure/persistence/SqliteSettingsRepository.js'
import { getDatabase } from './db/database.js'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { RespondToDiscussion } from './application/use-cases/RespondToDiscussion.js'
import type { TenantService } from './application/ports/TenantService.js'
import type { VcsPlugin, VcsProvider } from 'viper-vcs-providers'
import type { AiReviewer } from 'viper-ai-providers'

// Import registries from external packages — auto-registers all built-in plugins
import { registry as vcsRegistry } from 'viper-vcs-providers'
import { registry as aiRegistry } from 'viper-ai-providers'

interface ContainerOptions {
  tenantService?: TenantService
}

export function createContainer(options?: ContainerOptions) {
  const env = loadEnvConfig()
  const tenantService: TenantService = options?.tenantService ?? new NoOpTenantService()

  // Database + settings (always available — even before providers are configured)
  const db = getDatabase(env.DATABASE_PATH)
  const settings = new SqliteSettingsRepository(db)

  // Lazy-resolved providers — only created when settings exist
  let _vcsPlugin: VcsPlugin | null = null
  let _vcsProvider: VcsProvider | null = null
  let _aiReviewer: AiReviewer | null = null
  let _reviewMergeRequest: ReviewMergeRequest | null = null
  let _respondToDiscussion: RespondToDiscussion | null = null

  function resolveProviders(): { configured: boolean } {
    const vcsType = settings.get('vcs_provider_type')
    const vcsToken = settings.get('vcs_token')
    const vcsUrl = settings.get('vcs_url')
    const aiType = settings.get('ai_provider_type')
    const aiApiKey = settings.get('ai_api_key')
    const aiModel = settings.get('ai_model')

    const webhookSecret = settings.get('webhook_secret')

    if (!vcsType || !vcsToken || !vcsUrl || !aiType || !aiApiKey || !webhookSecret) {
      return { configured: false }
    }

    _vcsPlugin = vcsRegistry.get(vcsType)
    _vcsProvider = _vcsPlugin.createProvider({ token: vcsToken, url: vcsUrl })

    const aiPlugin = aiRegistry.get(aiType)
    _aiReviewer = aiPlugin.createReviewer({ apiKey: aiApiKey, model: aiModel ?? undefined })

    const configLoader = new YamlConfigLoader(_vcsProvider)
    const eventBus = new LogEventBus()

    _reviewMergeRequest = new ReviewMergeRequest(_vcsProvider, _aiReviewer, configLoader, eventBus)
    _respondToDiscussion = new RespondToDiscussion(_vcsProvider, _aiReviewer, configLoader)

    return { configured: true }
  }

  // Try resolving on startup (won't crash if not configured)
  let _configured = resolveProviders().configured

  return {
    env,
    settings,
    tenantService,
    vcsRegistry,
    aiRegistry,

    get configured(): boolean {
      return _configured
    },

    /** Re-read settings and rebuild providers. Call after PUT /api/settings. */
    reload(): { configured: boolean } {
      const result = resolveProviders()
      _configured = result.configured
      return result
    },

    get vcsPlugin(): VcsPlugin {
      if (!_vcsPlugin) throw new Error('VCS provider not configured')
      return _vcsPlugin
    },
    get vcsProvider(): VcsProvider {
      if (!_vcsProvider) throw new Error('VCS provider not configured')
      return _vcsProvider
    },
    get aiReviewer(): AiReviewer {
      if (!_aiReviewer) throw new Error('AI provider not configured')
      return _aiReviewer
    },
    get reviewMergeRequest(): ReviewMergeRequest {
      if (!_reviewMergeRequest) throw new Error('Providers not configured')
      return _reviewMergeRequest
    },
    get respondToDiscussion(): RespondToDiscussion {
      if (!_respondToDiscussion) throw new Error('Providers not configured')
      return _respondToDiscussion
    },
  }
}

export type Container = ReturnType<typeof createContainer>
