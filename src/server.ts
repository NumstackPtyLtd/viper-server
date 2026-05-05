/**
 * Public API for viper-server.
 *
 * This is what the cloud overlay imports:
 *
 *   import { createContainer, createApp } from 'viper-server/server'
 *
 * The open-source index.ts uses these same functions directly.
 */
export { createContainer, type Container } from './container.js'
export { createApp } from './app.js'
export { loadEnvConfig, type EnvConfig } from './infrastructure/config/EnvConfig.js'
export type { TenantService } from './application/ports/TenantService.js'
