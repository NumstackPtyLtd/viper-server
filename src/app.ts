/**
 * App factory — creates the Hono app with all routes mounted.
 *
 * This is the composable entry point that both the open-source
 * server and the cloud overlay use. The cloud overlay can mount
 * additional routes after calling this.
 */
import { Hono } from 'hono'
import type { Container } from './container.js'
import { healthRoutes } from './presentation/api/routes/health.js'
import { webhookRoutes } from './presentation/api/routes/webhook.js'

export function createApp(container: Container): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('Unhandled error:', err.message)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Health
  app.route('/', healthRoutes())

  // Webhook (VCS-agnostic — uses vcsPlugin from container)
  app.route('/', webhookRoutes({
    reviewMergeRequest: container.reviewMergeRequest,
    respondToDiscussion: container.respondToDiscussion,
    vcsPlugin: container.vcsPlugin,
    botUserId: container.env.BOT_USER_ID ?? null,
    webhookSecret: container.env.WEBHOOK_SECRET,
  }))

  // Provider discovery endpoints
  app.get('/api/vcs/types', (c) => {
    return c.json({ providers: container.vcsRegistry.schemas() })
  })

  app.get('/api/ai/types', (c) => {
    return c.json({ providers: container.aiRegistry.schemas() })
  })

  return app
}
