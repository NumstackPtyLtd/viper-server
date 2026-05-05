import type Database from 'better-sqlite3'
import type { WikiRepository, WikiRow, WikiListParams } from '../../domain/ports/WikiRepository.js'

export class SqliteWikiRepository implements WikiRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: WikiListParams): WikiRow[] {
    const conditions = ['org_id = ?']
    const args: unknown[] = [params.org_id]
    if (params.category) { conditions.push('category = ?'); args.push(params.category) }
    if (params.project_id === 'org') { conditions.push('project_id IS NULL') }
    else if (params.project_id) { conditions.push('project_id = ?'); args.push(params.project_id) }
    return this.db.prepare(`SELECT * FROM wiki_entries WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`).all(...args) as WikiRow[]
  }

  getById(id: string): WikiRow | null {
    return this.db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(id) as WikiRow | undefined ?? null
  }

  create(e: WikiRow): void {
    this.db.prepare('INSERT INTO wiki_entries (id, org_id, project_id, title, content, category, tags, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(e.id, e.org_id, e.project_id, e.title, e.content, e.category, e.tags, e.scope)
  }

  update(id: string, data: Partial<WikiRow>): void {
    const sets: string[] = ["updated_at = datetime('now')"]
    const args: unknown[] = []
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        sets.push(`${key} = ?`); args.push(val)
      }
    }
    args.push(id)
    this.db.prepare(`UPDATE wiki_entries SET ${sets.join(', ')} WHERE id = ?`).run(...args)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM wiki_entries WHERE id = ?').run(id)
  }

  search(orgId: string, q: string): WikiRow[] {
    return this.db.prepare('SELECT * FROM wiki_entries WHERE org_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY match_count DESC LIMIT 20')
      .all(orgId, `%${q}%`, `%${q}%`) as WikiRow[]
  }

  stats(orgId: string): {
    total: number; orgWide: number; neverMatched: number
    byCategory: Record<string, number>; byProject: Record<string, number>
    projects: Array<{ id: string; name: string }>; staleEntries: WikiRow[]; topMatched: WikiRow[]
  } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM wiki_entries WHERE org_id = ?').get(orgId) as { c: number }).c
    const orgWide = (this.db.prepare('SELECT COUNT(*) as c FROM wiki_entries WHERE org_id = ? AND project_id IS NULL').get(orgId) as { c: number }).c
    const neverMatched = (this.db.prepare('SELECT COUNT(*) as c FROM wiki_entries WHERE org_id = ? AND match_count = 0').get(orgId) as { c: number }).c

    const catRows = this.db.prepare('SELECT category, COUNT(*) as c FROM wiki_entries WHERE org_id = ? GROUP BY category').all(orgId) as Array<{ category: string; c: number }>
    const byCategory = Object.fromEntries(catRows.map((r) => [r.category, r.c]))

    const projRows = this.db.prepare('SELECT project_id, COUNT(*) as c FROM wiki_entries WHERE org_id = ? AND project_id IS NOT NULL GROUP BY project_id').all(orgId) as Array<{ project_id: string; c: number }>
    const byProject = Object.fromEntries(projRows.map((r) => [r.project_id, r.c]))

    const projects = this.db.prepare('SELECT id, name FROM projects WHERE org_id = ?').all(orgId) as Array<{ id: string; name: string }>
    const staleEntries = this.db.prepare('SELECT * FROM wiki_entries WHERE org_id = ? AND match_count = 0 ORDER BY created_at ASC LIMIT 5').all(orgId) as WikiRow[]
    const topMatched = this.db.prepare('SELECT * FROM wiki_entries WHERE org_id = ? AND match_count > 0 ORDER BY match_count DESC LIMIT 5').all(orgId) as WikiRow[]

    return { total, orgWide, neverMatched, byCategory, byProject, projects, staleEntries, topMatched }
  }

  bulkCreate(entries: WikiRow[]): number {
    const stmt = this.db.prepare('INSERT INTO wiki_entries (id, org_id, project_id, title, content, category, tags, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    let count = 0
    for (const e of entries) {
      stmt.run(e.id, e.org_id, e.project_id, e.title, e.content, e.category, e.tags, e.scope)
      count++
    }
    return count
  }
}
