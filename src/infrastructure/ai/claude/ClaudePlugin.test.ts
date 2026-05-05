import { describe, it, expect } from 'vitest'
import { ClaudePlugin } from './ClaudePlugin.js'

describe('ClaudePlugin', () => {
  const plugin = new ClaudePlugin()

  it('has correct type and name', () => {
    expect(plugin.type).toBe('claude')
    expect(plugin.name).toBe('Anthropic Claude')
  })

  it('lists available models', () => {
    expect(plugin.models.length).toBeGreaterThan(0)
    expect(plugin.models.some((m) => m.default)).toBe(true)
  })

  it('creates a reviewer with explicit model', () => {
    const reviewer = plugin.createReviewer({
      apiKey: 'test-key',
      model: 'claude-haiku-4-5-20251001',
    })
    expect(reviewer).toBeDefined()
    expect(reviewer.review).toBeTypeOf('function')
  })

  it('creates a reviewer with default model', () => {
    const reviewer = plugin.createReviewer({ apiKey: 'test-key' })
    expect(reviewer).toBeDefined()
  })

  it('has config schema', () => {
    expect(plugin.configSchema.length).toBeGreaterThan(0)
    expect(plugin.configSchema.some((f) => f.name === 'apiKey')).toBe(true)
  })
})
