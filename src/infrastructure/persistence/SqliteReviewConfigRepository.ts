import type Database from 'better-sqlite3'
import type { ReviewConfigRepository, ReviewConfigRow } from '../../domain/ports/ReviewConfigRepository.js'

export class SqliteReviewConfigRepository implements ReviewConfigRepository {
  constructor(private readonly db: Database.Database) {}

  list(orgId: string): ReviewConfigRow[] {
    return this.db.prepare('SELECT * FROM review_configs WHERE org_id = ?').all(orgId) as ReviewConfigRow[]
  }

  create(c: ReviewConfigRow): void {
    this.db.prepare('INSERT INTO review_configs (id, org_id, project_id, tone, verbosity, focus_areas, custom_rules, ignore_patterns, language, max_comments, auto_resolve, pedantic, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, c.org_id, c.project_id, c.tone, c.verbosity, c.focus_areas, c.custom_rules, c.ignore_patterns, c.language, c.max_comments, c.auto_resolve, c.pedantic, c.enabled)
  }

  update(id: string, data: Partial<ReviewConfigRow>): void {
    const sets: string[] = []
    const args: unknown[] = []
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') { sets.push(`${key} = ?`); args.push(val) }
    }
    if (sets.length === 0) return
    args.push(id)
    this.db.prepare(`UPDATE review_configs SET ${sets.join(', ')} WHERE id = ?`).run(...args)
  }
}
