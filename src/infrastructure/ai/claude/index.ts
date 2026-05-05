import { ClaudePlugin } from './ClaudePlugin.js'
import { aiRegistry } from '../../registries/aiRegistry.js'

export const claudePlugin = new ClaudePlugin()
aiRegistry.register(claudePlugin)
