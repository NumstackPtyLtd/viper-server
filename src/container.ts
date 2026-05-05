import { loadEnvConfig } from './infrastructure/config/EnvConfig.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { NoOpTenantService } from './infrastructure/tenant/NoOpTenantService.js'
import { SqliteSettingsRepository } from './infrastructure/persistence/SqliteSettingsRepository.js'
import { getDatabase } from './db/database.js'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { RespondToDiscussion } from './application/use-cases/RespondToDiscussion.js'
import type { TenantService } from './application/ports/TenantService.js'

// Import registries from external packages — auto-registers all built-in plugins
import { registry as vcsRegistry } from 'viper-vcs-providers'
import { registry as aiRegistry } from 'viper-ai-providers'

interface ContainerOptions {
  tenantService?: TenantService
}

export function createContainer(options?: ContainerOptions) {
  const env = loadEnvConfig()
  const tenantService: TenantService = options?.tenantService ?? new NoOpTenantService()

  // Database
  const db = getDatabase(env.DATABASE_PATH)
  const settings = new SqliteSettingsRepository(db)

  // Resolve providers from DB settings
  const vcsType = settings.get('vcs_provider_type')
  const vcsToken = settings.get('vcs_token')
  const vcsUrl = settings.get('vcs_url')
  const aiType = settings.get('ai_provider_type')
  const aiApiKey = settings.get('ai_api_key')
  const aiModel = settings.get('ai_model')

  if (!vcsType || !vcsToken || !vcsUrl) {
    throw new Error('VCS provider not configured. Set vcs_provider_type, vcs_token, and vcs_url in settings.')
  }
  if (!aiType || !aiApiKey) {
    throw new Error('AI provider not configured. Set ai_provider_type and ai_api_key in settings.')
  }

  const vcsPlugin = vcsRegistry.get(vcsType)
  const vcsProvider = vcsPlugin.createProvider({ token: vcsToken, url: vcsUrl })

  const aiPlugin = aiRegistry.get(aiType)
  const aiReviewer = aiPlugin.createReviewer({ apiKey: aiApiKey, model: aiModel ?? undefined })

  // Infrastructure
  const configLoader = new YamlConfigLoader(vcsProvider)
  const eventBus = new LogEventBus()

  // Application (use cases)
  const reviewMergeRequest = new ReviewMergeRequest(vcsProvider, aiReviewer, configLoader, eventBus)
  const respondToDiscussion = new RespondToDiscussion(vcsProvider, aiReviewer, configLoader)

  return {
    env,
    settings,
    tenantService,
    vcsPlugin,
    aiPlugin,
    vcsProvider,
    aiReviewer,
    configLoader,
    eventBus,
    reviewMergeRequest,
    respondToDiscussion,
    vcsRegistry,
    aiRegistry,
  }
}

export type Container = ReturnType<typeof createContainer>
