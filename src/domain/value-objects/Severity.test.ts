import { describe, it, expect } from 'vitest'
import { Severity } from './Severity.js'

describe('Severity', () => {
  it('creates from valid strings', () => {
    expect(Severity.from('critical').toString()).toBe('critical')
    expect(Severity.from('warning').toString()).toBe('warning')
    expect(Severity.from('suggestion').toString()).toBe('suggestion')
    expect(Severity.from('praise').toString()).toBe('praise')
  })

  it('has factory methods', () => {
    expect(Severity.critical().toString()).toBe('critical')
    expect(Severity.warning().toString()).toBe('warning')
    expect(Severity.suggestion().toString()).toBe('suggestion')
    expect(Severity.praise().toString()).toBe('praise')
  })

  it('throws on invalid value', () => {
    expect(() => Severity.from('invalid')).toThrow('Invalid severity')
  })

  it('identifies critical', () => {
    expect(Severity.critical().isCritical()).toBe(true)
    expect(Severity.warning().isCritical()).toBe(false)
  })

  it('identifies actionable', () => {
    expect(Severity.critical().isActionable()).toBe(true)
    expect(Severity.warning().isActionable()).toBe(true)
    expect(Severity.suggestion().isActionable()).toBe(true)
    expect(Severity.praise().isActionable()).toBe(false)
  })

  it('compares equality', () => {
    expect(Severity.critical().equals(Severity.critical())).toBe(true)
    expect(Severity.critical().equals(Severity.warning())).toBe(false)
  })
})
