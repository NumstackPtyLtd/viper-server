import { describe, it, expect } from 'vitest'
import { Registry } from './Registry.js'

interface TestPlugin {
  type: string
  name: string
  description: string
}

describe('Registry', () => {
  it('registers and retrieves plugins', () => {
    const reg = new Registry<TestPlugin>('test')
    const plugin: TestPlugin = { type: 'foo', name: 'Foo', description: 'A foo' }
    reg.register(plugin)

    expect(reg.get('foo')).toBe(plugin)
  })

  it('throws on unknown type', () => {
    const reg = new Registry<TestPlugin>('VCS')
    expect(() => reg.get('unknown')).toThrow('Unknown VCS type: "unknown"')
  })

  it('lists all registered plugins', () => {
    const reg = new Registry<TestPlugin>('test')
    reg.register({ type: 'a', name: 'A', description: 'aa' })
    reg.register({ type: 'b', name: 'B', description: 'bb' })

    expect(reg.list()).toHaveLength(2)
  })

  it('returns schemas', () => {
    const reg = new Registry<TestPlugin>('test')
    reg.register({ type: 'a', name: 'A', description: 'aa' })

    const schemas = reg.schemas()
    expect(schemas).toEqual([{ type: 'a', name: 'A', description: 'aa' }])
  })

  it('includes available types in error message', () => {
    const reg = new Registry<TestPlugin>('AI')
    reg.register({ type: 'claude', name: 'Claude', description: '' })
    reg.register({ type: 'openai', name: 'OpenAI', description: '' })

    expect(() => reg.get('gemini')).toThrow('Available: claude, openai')
  })
})
