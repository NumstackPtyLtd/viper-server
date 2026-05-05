/**
 * App factory — creates the Hono app with all routes mounted.
 *
 * This is the composable entry point that both the open-source
 * server and the cloud overlay use. The cloud overlay can mount
 * additional routes after calling this.
 */
import { Hono } from 'hono'
import type { Container } from './container.js'

export function createApp(container: Container): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('Unhandled error:', err.message)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Mount route modules
  app.route('/', container.healthRoutes)
  app.route('/', container.webhookRoutes)

  return app
}
