import { describe, it, expect } from 'vitest'
import { DiffFormatter } from './DiffFormatter.js'
import type { DiffFile } from '../../domain/ports/VcsProvider.js'

const makeDiff = (overrides: Partial<DiffFile> = {}): DiffFile => ({
  oldPath: 'src/app.ts',
  newPath: 'src/app.ts',
  diff: '@@ -1,3 +1,4 @@\n+import { foo } from "bar"',
  isNew: false,
  isDeleted: false,
  isRenamed: false,
  ...overrides,
})

describe('DiffFormatter', () => {
  describe('filterIgnored', () => {
    it('returns all files when no patterns', () => {
      const files = [makeDiff()]
      expect(DiffFormatter.filterIgnored(files, [])).toHaveLength(1)
    })

    it('filters matching patterns', () => {
      const files = [
        makeDiff({ newPath: 'package-lock.json' }),
        makeDiff({ newPath: 'src/app.ts' }),
        makeDiff({ newPath: 'dist/bundle.js' }),
      ]
      const filtered = DiffFormatter.filterIgnored(files, ['*.json', 'dist/**'])
      expect(filtered).toHaveLength(1)
      expect(filtered[0].newPath).toBe('src/app.ts')
    })

    it('uses oldPath when newPath is empty', () => {
      const files = [makeDiff({ newPath: '', oldPath: 'package-lock.json' })]
      const filtered = DiffFormatter.filterIgnored(files, ['*.json'])
      expect(filtered).toHaveLength(0)
    })
  })

  describe('format', () => {
    it('formats regular files', () => {
      const result = DiffFormatter.format([makeDiff()])
      expect(result).toContain('--- a/src/app.ts')
      expect(result).toContain('+++ b/src/app.ts')
    })

    it('formats new files', () => {
      const result = DiffFormatter.format([makeDiff({ isNew: true })])
      expect(result).toContain('--- /dev/null')
      expect(result).toContain('+++ b/src/app.ts')
    })

    it('formats deleted files', () => {
      const result = DiffFormatter.format([makeDiff({ isDeleted: true })])
      expect(result).toContain('--- a/src/app.ts')
      expect(result).toContain('+++ /dev/null')
    })

    it('joins multiple files', () => {
      const result = DiffFormatter.format([makeDiff(), makeDiff({ newPath: 'b.ts', oldPath: 'b.ts' })])
      expect(result).toContain('src/app.ts')
      expect(result).toContain('b.ts')
    })
  })
})
