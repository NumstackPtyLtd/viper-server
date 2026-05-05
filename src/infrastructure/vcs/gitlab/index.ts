import { GitLabPlugin } from './GitLabPlugin.js'
import { vcsRegistry } from '../../registries/vcsRegistry.js'

export const gitlabPlugin = new GitLabPlugin()
vcsRegistry.register(gitlabPlugin)
