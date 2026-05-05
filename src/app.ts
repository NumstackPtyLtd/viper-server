/**
 * App factory — creates the Hono app with all routes mounted.
 *
 * First run: visit / to get the setup wizard.
 * After setup: webhooks + all API routes active.
 */
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Container } from './container.js'
import { healthRoutes } from './presentation/api/routes/health.js'
import { webhookRoutes } from './presentation/api/routes/webhook.js'
import { settingsRoutes } from './presentation/api/routes/settings.js'
import { setupRoutes } from './presentation/api/routes/setup.js'
import { reviewRoutes } from './presentation/api/routes/reviews.js'
import { tokenRoutes } from './presentation/api/routes/tokens.js'
import { connectionRoutes } from './presentation/api/routes/connections.js'
import { projectRoutes } from './presentation/api/routes/projects.js'
import { wikiRoutes } from './presentation/api/routes/wiki.js'
import { reviewConfigRoutes } from './presentation/api/routes/reviewConfigs.js'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { RespondToDiscussion } from './application/use-cases/RespondToDiscussion.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { registry as aiRegistry } from 'viper-ai-providers'
import { logger } from './shared/logger.js'

const DEFAULT_ORG_ID = 'default'

export interface AppOptions {
  /** Override org resolution. Cloud passes JWT-based resolver. */
  getOrgId?: () => string
}

export function createApp(container: Container, options?: AppOptions): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('Unhandled error:', err.message)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Static assets
  app.use('/public/*', serveStatic({ root: './' }))

  // Root
  app.get('/', (c) => c.redirect(container.configured ? '/health' : '/setup'))

  // Always available
  app.route('/', healthRoutes())
  app.route('/', setupRoutes({ isConfigured: () => container.configured }))

  // Provider discovery
  app.get('/api/vcs/types', (c) => c.json({ providers: container.vcsRegistry.schemas() }))
  app.get('/api/ai/types', (c) => c.json({ providers: container.aiRegistry.schemas() }))

  // Status + reload
  app.get('/api/status', (c) => c.json({ configured: container.configured, vcs: container.vcsRegistry.schemas(), ai: container.aiRegistry.schemas() }))
  app.post('/api/reload', (c) => { const { configured } = container.reload(); return c.json({ ok: true, configured }) })

  // --- Data routes (org-scoped) ---
  // In OSS single-tenant mode, getOrgId returns DEFAULT_ORG_ID.
  // Cloud overlay replaces this via auth middleware (user's org from JWT).
  const getOrgId = options?.getOrgId ?? (() => DEFAULT_ORG_ID)

  app.route('/', reviewRoutes({ reviews: container.reviews, getOrgId }))
  app.route('/', tokenRoutes({ tokens: container.tokens, getOrgId }))
  app.route('/', connectionRoutes({ connections: container.connections, getOrgId }))
  app.route('/', projectRoutes({ projects: container.projects, getOrgId }))
  app.route('/', wikiRoutes({ wiki: container.wiki, getOrgId }))
  app.route('/', reviewConfigRoutes({ reviewConfigs: container.reviewConfigs, getOrgId }))

  // Settings routes last (catch-all /api/settings/:key)
  app.route('/', settingsRoutes({ settings: container.settings }))

  // Webhook — resolves AI reviewer from org token, falls back to server key
  app.post('/webhook', async (c) => {
    if (!container.configured) {
      return c.json({ error: 'Not configured. Visit /setup to get started.' }, 503)
    }
    const webhookSecret = container.settings.get('webhook_secret')
    if (!webhookSecret) return c.json({ error: 'webhook_secret not set.' }, 503)

    // Parse the webhook to find which repo it's for
    const rawBody = await c.req.raw.clone().text()
    const body = JSON.parse(rawBody)
    const event = container.vcsPlugin.parseWebhookPayload(body)

    // Resolve org from project full_path
    let repoFullName: string | undefined
    if (body.repository?.full_name) repoFullName = body.repository.full_name
    const project = repoFullName ? container.projects.findByFullPath(repoFullName) : null

    // Build AI reviewer: prefer org's default token, fall back to server key
    let reviewMergeRequest: ReviewMergeRequest
    let respondToDiscussion: RespondToDiscussion

    if (project) {
      const orgToken = container.tokens.getDefault(project.org_id)
      if (orgToken) {
        try {
          const aiPlugin = aiRegistry.get(orgToken.provider)
          const aiReviewer = aiPlugin.createReviewer({ apiKey: orgToken.api_key, model: orgToken.model ?? undefined })
          const configLoader = new YamlConfigLoader(container.vcsProvider)
          const eventBus = new LogEventBus()
          reviewMergeRequest = new ReviewMergeRequest(container.vcsProvider, aiReviewer, configLoader, eventBus)
          respondToDiscussion = new RespondToDiscussion(container.vcsProvider, aiReviewer, configLoader)
          logger.info({ org: project.org_id, provider: orgToken.provider }, 'Using org AI token')
        } catch {
          logger.warn({ org: project.org_id }, 'Failed to create AI reviewer from org token, falling back to server key')
          reviewMergeRequest = container.reviewMergeRequest
          respondToDiscussion = container.respondToDiscussion
        }
      } else {
        logger.info({ org: project.org_id }, 'No org token, using server AI key')
        reviewMergeRequest = container.reviewMergeRequest
        respondToDiscussion = container.respondToDiscussion
      }
    } else {
      logger.info({ repo: repoFullName }, 'Project not registered, using server AI key')
      reviewMergeRequest = container.reviewMergeRequest
      respondToDiscussion = container.respondToDiscussion
    }

    const botUserId = container.settings.get('bot_user_id')
    const handler = webhookRoutes({
      reviewMergeRequest,
      respondToDiscussion,
      vcsPlugin: container.vcsPlugin,
      botUserId: botUserId ? Number(botUserId) : null,
      webhookSecret,
    })
    return handler.fetch(c.req.raw)
  })

  return app
}
