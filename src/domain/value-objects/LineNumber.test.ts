import { describe, it, expect } from 'vitest'
import { LineNumber } from './LineNumber.js'

describe('LineNumber', () => {
  it('creates from valid number', () => {
    expect(LineNumber.from(1).toNumber()).toBe(1)
    expect(LineNumber.from(100).toNumber()).toBe(100)
  })

  it('throws on zero', () => {
    expect(() => LineNumber.from(0)).toThrow('positive integer')
  })

  it('throws on negative', () => {
    expect(() => LineNumber.from(-1)).toThrow('positive integer')
  })

  it('throws on decimal', () => {
    expect(() => LineNumber.from(1.5)).toThrow('positive integer')
  })

  it('compares equality', () => {
    expect(LineNumber.from(5).equals(LineNumber.from(5))).toBe(true)
    expect(LineNumber.from(5).equals(LineNumber.from(6))).toBe(false)
  })
})
