/**
 * Public API for viper-server.
 *
 * Cloud overlay imports composable pieces:
 *   import { createContainer, createApp } from 'viper-server/server'
 */
export { createContainer, type Container } from './container.js'
export { createApp } from './app.js'
export { loadEnvConfig, type EnvConfig } from './infrastructure/config/EnvConfig.js'
export { getDatabase } from './db/database.js'

// Persistence
export { SqliteSettingsRepository } from './infrastructure/persistence/SqliteSettingsRepository.js'
export { SqliteUserRepository } from './infrastructure/persistence/SqliteUserRepository.js'

// Ports
export type { TenantService } from './application/ports/TenantService.js'
export type { SettingsRepository } from './domain/ports/SettingsRepository.js'
export type { UserRepository, UserRow, OrgRow } from './domain/ports/UserRepository.js'
