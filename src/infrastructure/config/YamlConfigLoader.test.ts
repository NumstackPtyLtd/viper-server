import { describe, it, expect, vi } from 'vitest'
import { YamlConfigLoader } from './YamlConfigLoader.js'
import type { VcsProvider } from '@supaproxy/viper-vcs-providers'

function mockVcs(fileContent: string | null = null): VcsProvider {
  return {
    getFileContent: vi.fn().mockResolvedValue(fileContent),
    getMergeRequestDiff: vi.fn(),
    getMergeRequestVersion: vi.fn(),
    getDiscussions: vi.fn(),
    createInlineComment: vi.fn(),
    createComment: vi.fn(),
    replyToDiscussion: vi.fn(),
    resolveDiscussion: vi.fn(),
  }
}

describe('YamlConfigLoader', () => {
  it('returns defaults when no .viper.yml', async () => {
    const vcs = mockVcs(null)
    const loader = new YamlConfigLoader(vcs)
    const config = await loader.load(1, 'main')

    expect(config.style.tone).toBe('friendly')
    expect(config.maxComments).toBe(20)
    expect(config.autoResolve).toBe(true)
    expect(config.rules).toEqual([])
    expect(config.ignore).toEqual([])
  })

  it('parses valid .viper.yml', async () => {
    const yaml = `
version: 1
review:
  style:
    tone: strict
    focus:
      - security
    language: French
  rules:
    - "No any"
  ignore:
    - "dist/**"
  max_comments: 10
  auto_resolve: false
`
    const vcs = mockVcs(yaml)
    const loader = new YamlConfigLoader(vcs)
    const config = await loader.load(1, 'main')

    expect(config.style.tone).toBe('strict')
    expect(config.style.focus).toEqual(['security'])
    expect(config.style.language).toBe('French')
    expect(config.rules).toEqual(['No any'])
    expect(config.ignore).toEqual(['dist/**'])
    expect(config.maxComments).toBe(10)
    expect(config.autoResolve).toBe(false)
  })

  it('returns defaults on invalid YAML', async () => {
    const vcs = mockVcs('not: [valid: yaml: {{')
    const loader = new YamlConfigLoader(vcs)
    const config = await loader.load(1, 'main')

    expect(config.style.tone).toBe('friendly')
  })

  it('fills missing fields with defaults', async () => {
    const yaml = `
version: 1
review:
  style:
    tone: concise
`
    const vcs = mockVcs(yaml)
    const loader = new YamlConfigLoader(vcs)
    const config = await loader.load(1, 'main')

    expect(config.style.tone).toBe('concise')
    expect(config.maxComments).toBe(20)
    expect(config.rules).toEqual([])
  })
})
