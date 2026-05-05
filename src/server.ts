/**
 * Public API for viper-server.
 *
 * This is what the cloud overlay imports:
 *
 *   import { createContainer, createApp, vcsRegistry, aiRegistry } from 'viper-server/server'
 *
 * The open-source index.ts uses these same functions directly.
 */
export { createContainer, type Container } from './container.js'
export { createApp } from './app.js'
export { loadEnvConfig, type EnvConfig } from './infrastructure/config/EnvConfig.js'
export type { TenantService } from './application/ports/TenantService.js'
export type { VcsPlugin, WebhookEvent, VcsPluginConfig, ConfigField } from './application/ports/VcsPlugin.js'
export type { AiPlugin, AiPluginConfig, AiModel } from './application/ports/AiPlugin.js'
export type { PluginRegistry } from './application/ports/PluginRegistry.js'
export { vcsRegistry } from './infrastructure/registries/vcsRegistry.js'
export { aiRegistry } from './infrastructure/registries/aiRegistry.js'
