import { minimatch } from 'minimatch'
import type { GlobMatcher } from '../../domain/ports/GlobMatcher.js'

export class MinimatchGlobMatcher implements GlobMatcher {
  match(file: string, pattern: string): boolean {
    return minimatch(file, pattern, { dot: true })
  }
}
