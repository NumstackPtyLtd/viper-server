import { describe, it, expect } from 'vitest'
import { ReviewFinding } from './ReviewFinding.js'
import { FilePath } from '../value-objects/FilePath.js'
import { LineNumber } from '../value-objects/LineNumber.js'
import { Severity } from '../value-objects/Severity.js'

describe('ReviewFinding', () => {
  const validProps = () => ({
    file: FilePath.from('src/app.ts'),
    line: LineNumber.from(42),
    severity: Severity.critical(),
    comment: 'Missing null check',
  })

  it('creates with valid props', () => {
    const finding = ReviewFinding.create(validProps())
    expect(finding.getFile().toString()).toBe('src/app.ts')
    expect(finding.getLine().toNumber()).toBe(42)
    expect(finding.getSeverity().toString()).toBe('critical')
    expect(finding.getComment()).toBe('Missing null check')
  })

  it('throws on empty comment', () => {
    expect(() => ReviewFinding.create({ ...validProps(), comment: '' })).toThrow('comment cannot be empty')
    expect(() => ReviewFinding.create({ ...validProps(), comment: '   ' })).toThrow('comment cannot be empty')
  })

  it('is actionable when not praise', () => {
    const critical = ReviewFinding.create(validProps())
    expect(critical.isActionable()).toBe(true)

    const praise = ReviewFinding.create({ ...validProps(), severity: Severity.praise() })
    expect(praise.isActionable()).toBe(false)
  })
})
