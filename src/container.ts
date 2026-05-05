import { loadEnvConfig } from './infrastructure/config/EnvConfig.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { NoOpTenantService } from './infrastructure/tenant/NoOpTenantService.js'
import { SqliteSettingsRepository } from './infrastructure/persistence/SqliteSettingsRepository.js'
import { SqliteUserRepository } from './infrastructure/persistence/SqliteUserRepository.js'
import { SqliteReviewRepository } from './infrastructure/persistence/SqliteReviewRepository.js'
import { SqliteTokenRepository } from './infrastructure/persistence/SqliteTokenRepository.js'
import { SqliteConnectionRepository } from './infrastructure/persistence/SqliteConnectionRepository.js'
import { SqliteProjectRepository } from './infrastructure/persistence/SqliteProjectRepository.js'
import { SqliteWikiRepository } from './infrastructure/persistence/SqliteWikiRepository.js'
import { SqliteReviewConfigRepository } from './infrastructure/persistence/SqliteReviewConfigRepository.js'
import { SqlitePolicyRepository } from './infrastructure/persistence/SqlitePolicyRepository.js'
import { MinimatchGlobMatcher } from './infrastructure/glob/MinimatchGlobMatcher.js'
import { getDatabase } from './db/database.js'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { PolicyResolver } from './application/services/PolicyResolver.js'
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

  // Database + repositories (always available — even before providers are configured)
  const db = getDatabase(env.DATABASE_PATH)
  const settings = new SqliteSettingsRepository(db)
  const users = new SqliteUserRepository(db)
  const reviews = new SqliteReviewRepository(db)
  const tokens = new SqliteTokenRepository(db)
  const connections = new SqliteConnectionRepository(db)
  const projects = new SqliteProjectRepository(db)
  const wiki = new SqliteWikiRepository(db)
  const reviewConfigs = new SqliteReviewConfigRepository(db)
  const policies = new SqlitePolicyRepository(db)
  const globMatcher = new MinimatchGlobMatcher()
  const policyResolver = new PolicyResolver(policies, wiki, globMatcher)

  // Lazy-resolved providers — only created when settings exist
  let _vcsPlugin: VcsPlugin | null = null
  let _vcsProvider: VcsProvider | null = null
  let _aiReviewer: AiReviewer | null = null
  let _reviewMergeRequest: ReviewMergeRequest | null = null
  let _respondToDiscussion: RespondToDiscussion | null = null

  function resolveProviders(): { configured: boolean } {
    const vcsType = settings.get('vcs_provider_type')
    const aiType = settings.get('ai_provider_type')
    const webhookSecret = settings.get('webhook_secret')

    if (!vcsType || !aiType || !webhookSecret) {
      return { configured: false }
    }

    // Collect all vcs_* and ai_* settings, strip prefix, pass to plugin
    const allSettings = settings.all()
    const vcsConfig: Record<string, string> = {}
    const aiConfig: Record<string, string> = {}
    for (const { key, value } of allSettings) {
      if (key.startsWith('vcs_') && key !== 'vcs_provider_type') {
        vcsConfig[key.slice(4)] = value
      }
      if (key.startsWith('ai_') && key !== 'ai_provider_type') {
        aiConfig[key.slice(3)] = value
      }
    }

    // Validate required fields from plugin schema
    _vcsPlugin = vcsRegistry.get(vcsType)
    const missingVcs = _vcsPlugin.configSchema
      .filter((f) => f.required && !vcsConfig[f.name] && !f.defaultValue)
      .map((f) => f.name)
    if (missingVcs.length > 0) {
      _vcsPlugin = null
      return { configured: false }
    }

    // Apply defaults from schema
    for (const f of _vcsPlugin.configSchema) {
      if (!vcsConfig[f.name] && f.defaultValue) vcsConfig[f.name] = f.defaultValue
    }

    _vcsProvider = _vcsPlugin.createProvider(vcsConfig)

    const aiPlugin = aiRegistry.get(aiType)
    const missingAi = aiPlugin.configSchema
      .filter((f) => f.required && !aiConfig[f.name] && !f.defaultValue)
      .map((f) => f.name)
    if (missingAi.length > 0) {
      _vcsPlugin = null
      _vcsProvider = null
      return { configured: false }
    }

    for (const f of aiPlugin.configSchema) {
      if (!aiConfig[f.name] && f.defaultValue) aiConfig[f.name] = f.defaultValue
    }

    _aiReviewer = aiPlugin.createReviewer({ apiKey: aiConfig.api_key ?? '', model: aiConfig.model })

    const configLoader = new YamlConfigLoader(_vcsProvider)
    const eventBus = new LogEventBus()

    _reviewMergeRequest = new ReviewMergeRequest(_vcsProvider, _aiReviewer, configLoader, eventBus, policyResolver, wiki)
    _respondToDiscussion = new RespondToDiscussion(_vcsProvider, _aiReviewer, configLoader)

    return { configured: true }
  }

  // Try resolving on startup (won't crash if not configured)
  let _configured = resolveProviders().configured

  return {
    env,
    settings,
    users,
    reviews,
    tokens,
    connections,
    projects,
    wiki,
    reviewConfigs,
    policies,
    policyResolver,
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
