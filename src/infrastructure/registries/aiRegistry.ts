import type { AiPlugin } from '../../application/ports/AiPlugin.js'
import { Registry } from './Registry.js'

export const aiRegistry = new Registry<AiPlugin>('AI provider')
