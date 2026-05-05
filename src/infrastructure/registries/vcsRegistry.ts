import type { VcsPlugin } from '../../application/ports/VcsPlugin.js'
import { Registry } from './Registry.js'

export const vcsRegistry = new Registry<VcsPlugin>('VCS provider')
