import { loadEnvConfig } from './infrastructure/config/EnvConfig.js'
import { GitLabVcsProvider } from './infrastructure/vcs/gitlab/GitLabVcsProvider.js'
import { ClaudeAiReviewer } from './infrastructure/ai/claude/ClaudeAiReviewer.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { NoOpTenantService } from './infrastructure/tenant/NoOpTenantService.js'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { RespondToDiscussion } from './application/use-cases/RespondToDiscussion.js'
import { healthRoutes } from './presentation/api/routes/health.js'
import { webhookRoutes } from './presentation/api/routes/webhook.js'
import type { TenantService } from './application/ports/TenantService.js'

interface ContainerOptions {
  tenantService?: TenantService
}

export function createContainer(options?: ContainerOptions) {
  const env = loadEnvConfig()

  // Tenant service — defaults to NoOp (single-tenant)
  const tenantService: TenantService = options?.tenantService ?? new NoOpTenantService()

  // Infrastructure (adapters implementing domain ports)
  const vcsProvider = new GitLabVcsProvider(env.GITLAB_TOKEN, env.GITLAB_URL)
  const aiReviewer = new ClaudeAiReviewer(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL)
  const configLoader = new YamlConfigLoader(vcsProvider)
  const eventBus = new LogEventBus()

  // Application (use cases)
  const reviewMergeRequest = new ReviewMergeRequest(vcsProvider, aiReviewer, configLoader, eventBus)
  const respondToDiscussion = new RespondToDiscussion(vcsProvider, aiReviewer, configLoader)

  // Presentation (route modules)
  const healthRoutesModule = healthRoutes()
  const webhookRoutesModule = webhookRoutes({
    reviewMergeRequest,
    respondToDiscussion,
    botUserId: env.BOT_USER_ID ?? null,
    webhookSecret: env.GITLAB_WEBHOOK_SECRET,
  })

  return {
    env,
    tenantService,
    vcsProvider,
    aiReviewer,
    configLoader,
    eventBus,
    reviewMergeRequest,
    respondToDiscussion,
    healthRoutes: healthRoutesModule,
    webhookRoutes: webhookRoutesModule,
  }
}

export type Container = ReturnType<typeof createContainer>
