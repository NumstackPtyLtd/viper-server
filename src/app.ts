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
import { githubAppRoutes } from './presentation/api/routes/github-app.js'

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
  app.route('/', settingsRoutes({ settings: container.settings }))
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

  app.route('/', githubAppRoutes({ settings: container.settings }))
  app.route('/', reviewRoutes({ reviews: container.reviews, getOrgId }))
  app.route('/', tokenRoutes({ tokens: container.tokens, getOrgId, aiRegistry: container.aiRegistry as any }))
  app.route('/', connectionRoutes({ connections: container.connections, getOrgId }))
  app.route('/', projectRoutes({ projects: container.projects, getOrgId }))
  app.route('/', wikiRoutes({ wiki: container.wiki, getOrgId }))
  app.route('/', reviewConfigRoutes({ reviewConfigs: container.reviewConfigs, getOrgId }))

  // Webhook
  app.post('/webhook', async (c) => {
    if (!container.configured) {
      return c.json({ error: 'Not configured. Visit /setup to get started.' }, 503)
    }
    const webhookSecret = container.settings.get('webhook_secret')
    if (!webhookSecret) return c.json({ error: 'webhook_secret not set.' }, 503)
    const botUserId = container.settings.get('bot_user_id')
    const handler = webhookRoutes({
      reviewMergeRequest: container.reviewMergeRequest,
      respondToDiscussion: container.respondToDiscussion,
      vcsPlugin: container.vcsPlugin,
      botUserId: botUserId ? Number(botUserId) : null,
      webhookSecret,
    })
    return handler.fetch(c.req.raw)
  })

  return app
}
