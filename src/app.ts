/**
 * App factory — creates the Hono app with all routes mounted.
 *
 * The server boots even when providers aren't configured.
 * Settings + discovery endpoints always work.
 * Webhooks return 503 until providers are configured via PUT /api/settings.
 */
import { Hono } from 'hono'
import type { Container } from './container.js'
import { healthRoutes } from './presentation/api/routes/health.js'
import { webhookRoutes } from './presentation/api/routes/webhook.js'
import { settingsRoutes } from './presentation/api/routes/settings.js'

export function createApp(container: Container): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('Unhandled error:', err.message)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Always available
  app.route('/', healthRoutes())
  app.route('/', settingsRoutes({ settings: container.settings }))

  // Provider discovery
  app.get('/api/vcs/types', (c) => c.json({ providers: container.vcsRegistry.schemas() }))
  app.get('/api/ai/types', (c) => c.json({ providers: container.aiRegistry.schemas() }))

  // Status: is the server configured?
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

  // Webhook — guarded, returns 503 if not configured
  app.post('/webhook', async (c) => {
    if (!container.configured) {
      return c.json({ error: 'Providers not configured. Use PUT /api/settings then POST /api/reload.' }, 503)
    }

    // Delegate to the webhook handler
    const handler = webhookRoutes({
      reviewMergeRequest: container.reviewMergeRequest,
      respondToDiscussion: container.respondToDiscussion,
      vcsPlugin: container.vcsPlugin,
      botUserId: container.env.BOT_USER_ID ?? null,
      webhookSecret: container.env.WEBHOOK_SECRET,
    })
    return handler.fetch(c.req.raw)
  })

  return app
}
