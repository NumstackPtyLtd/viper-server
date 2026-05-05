import type Database from 'better-sqlite3'
import type { ReviewRepository, ReviewRow, FindingRow, ReviewListParams } from '../../domain/ports/ReviewRepository.js'

export class SqliteReviewRepository implements ReviewRepository {
  constructor(private readonly db: Database.Database) {}

  create(r: ReviewRow): void {
    this.db.prepare(`INSERT INTO reviews (id, org_id, project_id, mr_iid, title, description, source_branch, target_branch, author, provider, verdict, summary, findings_count, critical_count, warning_count, suggestion_count, praise_count, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(r.id, r.org_id, r.project_id, r.mr_iid, r.title, r.description, r.source_branch, r.target_branch, r.author, r.provider, r.verdict, r.summary, r.findings_count, r.critical_count, r.warning_count, r.suggestion_count, r.praise_count, r.url)
  }

  addFindings(findings: FindingRow[]): void {
    const stmt = this.db.prepare('INSERT INTO findings (id, review_id, file, line, severity, comment) VALUES (?, ?, ?, ?, ?, ?)')
    for (const f of findings) {
      stmt.run(f.id, f.review_id, f.file, f.line, f.severity, f.comment)
    }
  }

  list(params: ReviewListParams): { reviews: ReviewRow[]; total: number } {
    const conditions = ['org_id = ?']
    const args: unknown[] = [params.org_id]

    if (params.provider) { conditions.push('provider = ?'); args.push(params.provider) }
    if (params.project_id) { conditions.push('project_id = ?'); args.push(params.project_id) }
    if (params.verdict) { conditions.push('verdict = ?'); args.push(params.verdict) }
    if (params.severity === 'critical') { conditions.push('critical_count > 0') }
    else if (params.severity === 'warning') { conditions.push('warning_count > 0') }
    else if (params.severity === 'clean') { conditions.push('critical_count = 0 AND warning_count = 0') }
    if (params.q) { conditions.push('title LIKE ?'); args.push(`%${params.q}%`) }

    const where = conditions.join(' AND ')
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM reviews WHERE ${where}`).get(...args) as { c: number }).c
    const limit = params.limit ?? 10
    const offset = params.offset ?? 0
    const reviews = this.db.prepare(`SELECT * FROM reviews WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...args, limit, offset) as ReviewRow[]

    return { reviews, total }
  }

  getById(id: string): ReviewRow | null {
    return this.db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as ReviewRow | undefined ?? null
  }

  getFindings(reviewId: string): FindingRow[] {
    return this.db.prepare('SELECT * FROM findings WHERE review_id = ?').all(reviewId) as FindingRow[]
  }

  stats(orgId: string): { total: number; thisWeek: number; criticals: number; totalFindings: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM reviews WHERE org_id = ?').get(orgId) as { c: number }).c
    const thisWeek = (this.db.prepare("SELECT COUNT(*) as c FROM reviews WHERE org_id = ? AND created_at >= datetime('now', '-7 days')").get(orgId) as { c: number }).c
    const criticals = (this.db.prepare('SELECT COALESCE(SUM(critical_count), 0) as c FROM reviews WHERE org_id = ?').get(orgId) as { c: number }).c
    const totalFindings = (this.db.prepare('SELECT COALESCE(SUM(findings_count), 0) as c FROM reviews WHERE org_id = ?').get(orgId) as { c: number }).c
    return { total, thisWeek, criticals, totalFindings }
  }
}
