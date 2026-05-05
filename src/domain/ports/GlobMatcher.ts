export interface GlobMatcher {
  match(file: string, pattern: string): boolean
}
