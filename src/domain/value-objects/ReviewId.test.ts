import { describe, it, expect } from 'vitest'
import { ReviewId } from './ReviewId.js'

describe('ReviewId', () => {
  it('creates a new unique id', () => {
    const id1 = ReviewId.create()
    const id2 = ReviewId.create()
    expect(id1.toString()).toBeTruthy()
    expect(id1.equals(id2)).toBe(false)
  })

  it('creates from existing value', () => {
    const id = ReviewId.from('abc-123')
    expect(id.toString()).toBe('abc-123')
  })

  it('throws on empty value', () => {
    expect(() => ReviewId.from('')).toThrow('ReviewId cannot be empty')
    expect(() => ReviewId.from('   ')).toThrow('ReviewId cannot be empty')
  })

  it('compares equality', () => {
    const id1 = ReviewId.from('same')
    const id2 = ReviewId.from('same')
    expect(id1.equals(id2)).toBe(true)
  })
})
