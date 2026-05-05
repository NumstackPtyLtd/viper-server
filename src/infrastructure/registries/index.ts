/**
 * Plugin auto-registration.
 *
 * Importing this module registers all built-in plugins.
 * New providers are added here — no changes to container or app needed.
 */

// VCS providers
import '../vcs/gitlab/index.js'
// import '../vcs/github/index.js'  // future

// AI providers
import '../ai/claude/index.js'
// import '../ai/openai/index.js'   // future

export { vcsRegistry } from './vcsRegistry.js'
export { aiRegistry } from './aiRegistry.js'
