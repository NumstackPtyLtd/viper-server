import { describe, it, expect } from 'vitest'
import { FilePath } from './FilePath.js'

describe('FilePath', () => {
  it('creates from valid string', () => {
    const fp = FilePath.from('src/index.ts')
    expect(fp.toString()).toBe('src/index.ts')
  })

  it('trims whitespace', () => {
    expect(FilePath.from('  src/app.ts  ').toString()).toBe('src/app.ts')
  })

  it('throws on empty', () => {
    expect(() => FilePath.from('')).toThrow('FilePath cannot be empty')
    expect(() => FilePath.from('   ')).toThrow('FilePath cannot be empty')
  })

  it('returns extension', () => {
    expect(FilePath.from('file.ts').extension()).toBe('ts')
    expect(FilePath.from('file.test.ts').extension()).toBe('ts')
    expect(FilePath.from('Makefile').extension()).toBe('')
  })

  it('compares equality', () => {
    expect(FilePath.from('a.ts').equals(FilePath.from('a.ts'))).toBe(true)
    expect(FilePath.from('a.ts').equals(FilePath.from('b.ts'))).toBe(false)
  })
})
