import { describe, it, expect } from 'vitest'
import { Review } from './Review.js'
import { ReviewFinding } from './ReviewFinding.js'
import { MergeRequestId } from '../value-objects/MergeRequestId.js'
import { FilePath } from '../value-objects/FilePath.js'
import { LineNumber } from '../value-objects/LineNumber.js'
import { Severity } from '../value-objects/Severity.js'

function makeFinding(severity: Severity = Severity.warning()): ReviewFinding {
  return ReviewFinding.create({
    file: FilePath.from('src/app.ts'),
    line: LineNumber.from(10),
    severity,
    comment: 'Test comment',
  })
}

describe('Review', () => {
  const mrId = MergeRequestId.create(1, 1)

  it('creates with findings', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Good code',
      findings: [makeFinding()],
    })

    expect(review.getSummary()).toBe('Good code')
    expect(review.getFindings()).toHaveLength(1)
    expect(review.getId().toString()).toBeTruthy()
    expect(review.getCreatedAt()).toBeInstanceOf(Date)
  })

  it('creates with empty findings', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Clean',
      findings: [],
    })
    expect(review.getFindings()).toHaveLength(0)
  })

  it('returns actionable findings (excludes praise)', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Mixed',
      findings: [
        makeFinding(Severity.critical()),
        makeFinding(Severity.warning()),
        makeFinding(Severity.praise()),
      ],
    })
    expect(review.getActionableFindings()).toHaveLength(2)
  })

  it('counts critical findings', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Issues',
      findings: [
        makeFinding(Severity.critical()),
        makeFinding(Severity.critical()),
        makeFinding(Severity.warning()),
      ],
    })
    expect(review.getCriticalCount()).toBe(2)
  })

  it('emits ReviewCompletedEvent on creation', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Done',
      findings: [makeFinding()],
    })

    const events = review.pullDomainEvents()
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('review.completed')
  })

  it('drains events after pull', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Done',
      findings: [],
    })

    review.pullDomainEvents()
    expect(review.pullDomainEvents()).toHaveLength(0)
  })

  it('returns merge request id', () => {
    const review = Review.create({
      mergeRequestId: mrId,
      summary: 'Ok',
      findings: [],
    })
    expect(review.getMergeRequestId().equals(mrId)).toBe(true)
  })
})
