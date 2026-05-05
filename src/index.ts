/**
 * Open-source server entry point.
 *
 * Uses the composable pieces directly — no cloud overlay.
 * Single-tenant mode (NoOpTenantService is the default).
 *
 * The cloud overlay (viper-cloud) imports from ./server.ts
 * and injects CloudTenantService + additional routes.
 */
import { serve } from '@hono/node-server'
import { createContainer } from './container.js'
import { createApp } from './app.js'
import { logger } from './shared/logger.js'

// --- Composition root (single-tenant, no options needed) ---
const container = createContainer()

// --- App ---
const app = createApp(container)

// --- Start ---
serve({ fetch: app.fetch, port: container.env.PORT }, (info) => {
  logger.info({ port: info.port }, 'Viper server listening')
})
