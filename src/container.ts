import { loadEnvConfig } from './infrastructure/config/EnvConfig.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { NoOpTenantService } from './infrastructure/tenant/NoOpTenantService.js'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { RespondToDiscussion } from './application/use-cases/RespondToDiscussion.js'
import type { TenantService } from './application/ports/TenantService.js'

// Import registries — this auto-registers all built-in plugins
import { vcsRegistry, aiRegistry } from './infrastructure/registries/index.js'

interface ContainerOptions {
  tenantService?: TenantService
}

export function createContainer(options?: ContainerOptions) {
  const env = loadEnvConfig()

  // Tenant service — defaults to NoOp (single-tenant)
  const tenantService: TenantService = options?.tenantService ?? new NoOpTenantService()

  // Resolve VCS plugin by type from env (no hardcoded imports)
  const vcsPlugin = vcsRegistry.get(env.VCS_PROVIDER)
  const vcsProvider = vcsPlugin.createProvider({
    token: env.VCS_TOKEN,
    url: env.VCS_URL,
  })

  // Resolve AI plugin by type from env (no hardcoded imports)
  const aiPlugin = aiRegistry.get(env.AI_PROVIDER)
  const aiReviewer = aiPlugin.createReviewer({
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
  })

  // Infrastructure
  const configLoader = new YamlConfigLoader(vcsProvider)
  const eventBus = new LogEventBus()

  // Application (use cases)
  const reviewMergeRequest = new ReviewMergeRequest(vcsProvider, aiReviewer, configLoader, eventBus)
  const respondToDiscussion = new RespondToDiscussion(vcsProvider, aiReviewer, configLoader)

  return {
    env,
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
