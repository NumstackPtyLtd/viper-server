/**
 * Open-source server entry point.
 *
 * Boots even when providers aren't configured.
 * Configure via: PUT /api/settings then POST /api/reload
 */
import { serve } from '@hono/node-server'
import { createContainer } from './container.js'
import { createApp } from './app.js'
import { logger } from './shared/logger.js'

const container = createContainer()
const app = createApp(container)

serve({ fetch: app.fetch, port: container.env.PORT }, (info) => {
  logger.info({ port: info.port }, 'Viper server listening')

  if (container.configured) {
    logger.info('Providers configured — ready to review')
  } else {
    logger.warn('Providers not configured — PUT /api/settings then POST /api/reload')
  }
})
