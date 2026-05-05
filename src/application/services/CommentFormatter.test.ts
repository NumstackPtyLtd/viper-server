import { describe, it, expect } from 'vitest'
import { CommentFormatter } from './CommentFormatter.js'
import { Review } from '../../domain/entities/Review.js'
import { ReviewFinding } from '../../domain/entities/ReviewFinding.js'
import { MergeRequestId } from '../../domain/value-objects/MergeRequestId.js'
import { FilePath } from '../../domain/value-objects/FilePath.js'
import { LineNumber } from '../../domain/value-objects/LineNumber.js'
import { Severity } from '../../domain/value-objects/Severity.js'

function makeFinding(severity: Severity, comment = 'Test comment'): ReviewFinding {
  return ReviewFinding.create({
    file: FilePath.from('src/app.ts'),
    line: LineNumber.from(10),
    severity,
    comment,
  })
}

function makeReview(findings: ReviewFinding[] = [], summary = 'Good code'): Review {
  return Review.create({
    mergeRequestId: MergeRequestId.create(1, 1),
    summary,
    findings,
  })
}

describe('CommentFormatter', () => {
  describe('formatSummary', () => {
    it('includes summary text', () => {
      const review = makeReview([], 'Clean MR')
      const result = CommentFormatter.formatSummary(review)
      expect(result).toContain('Clean MR')
      expect(result).toContain('## Viper Review')
    })

    it('includes finding counts', () => {
      const review = makeReview([
        makeFinding(Severity.critical()),
        makeFinding(Severity.warning()),
        makeFinding(Severity.warning()),
        makeFinding(Severity.suggestion()),
      ])
      const result = CommentFormatter.formatSummary(review)
      expect(result).toContain('1 critical')
      expect(result).toContain('2 warnings')
      expect(result).toContain('1 suggestion')
    })

    it('includes praise section', () => {
      const review = makeReview([makeFinding(Severity.praise(), 'Nice pattern')])
      const result = CommentFormatter.formatSummary(review)
      expect(result).toContain('Nice pattern')
      expect(result).toContain('**Nice:**')
    })

    it('includes Viper signature', () => {
      const review = makeReview()
      const result = CommentFormatter.formatSummary(review)
      expect(result).toContain('Review by [Viper]')
    })
  })

  describe('formatFinding', () => {
    it('formats critical with icon', () => {
      const finding = makeFinding(Severity.critical(), 'Bug found')
      const result = CommentFormatter.formatFinding(finding)
      expect(result).toContain(':rotating_light:')
      expect(result).toContain('**critical**')
      expect(result).toContain('Bug found')
    })

    it('formats warning with icon', () => {
      const finding = makeFinding(Severity.warning(), 'Watch out')
      const result = CommentFormatter.formatFinding(finding)
      expect(result).toContain(':warning:')
    })

    it('formats suggestion with icon', () => {
      const finding = makeFinding(Severity.suggestion(), 'Consider this')
      const result = CommentFormatter.formatFinding(finding)
      expect(result).toContain(':bulb:')
    })
  })
})
