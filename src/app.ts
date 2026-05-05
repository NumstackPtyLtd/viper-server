/**
 * App factory — creates the Hono app with all routes mounted.
 *
 * First run: visit / to get the setup wizard.
 * After setup: webhooks active, / redirects to /health.
 */
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Container } from './container.js'
import { healthRoutes } from './presentation/api/routes/health.js'
import { webhookRoutes } from './presentation/api/routes/webhook.js'
import { settingsRoutes } from './presentation/api/routes/settings.js'
import { setupRoutes } from './presentation/api/routes/setup.js'

export function createApp(container: Container): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('Unhandled error:', err.message)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Static assets (fonts, favicon)
  app.use('/public/*', serveStatic({ root: './' }))

  // Root — redirect to setup if unconfigured
  app.get('/', (c) => {
    return c.redirect(container.configured ? '/health' : '/setup')
  })

  // Always available
  app.route('/', healthRoutes())
  app.route('/', settingsRoutes({ settings: container.settings }))
  app.route('/', setupRoutes({
    isConfigured: () => container.configured,
  }))

  // Provider discovery
  app.get('/api/vcs/types', (c) => c.json({ providers: container.vcsRegistry.schemas() }))
  app.get('/api/ai/types', (c) => c.json({ providers: container.aiRegistry.schemas() }))

  // Status
  app.get('/api/status', (c) => {
    return c.json({
      configured: container.configured,
      vcs: container.vcsRegistry.schemas(),
      ai: container.aiRegistry.schemas(),
    })
  })

  // Reload providers after settings change
  app.post('/api/reload', (c) => {
    const { configured } = container.reload()
    return c.json({ ok: true, configured })
  })

  // Webhook — guarded
  app.post('/webhook', async (c) => {
    if (!container.configured) {
      return c.json({ error: 'Not configured. Visit /setup to get started.' }, 503)
    }

    const webhookSecret = container.settings.get('webhook_secret')
    if (!webhookSecret) {
      return c.json({ error: 'webhook_secret not set.' }, 503)
    }

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
