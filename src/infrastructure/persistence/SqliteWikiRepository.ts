import type Database from 'better-sqlite3'
import type { WikiRepository, WikiRow, WikiListParams, WikiListResult } from '../../domain/ports/WikiRepository.js'

export class SqliteWikiRepository implements WikiRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: WikiListParams): WikiListResult {
    const conditions = ['owner_type = ?', 'owner_id = ?']
    const args: unknown[] = [params.owner_type, params.owner_id]
    if (params.category) { conditions.push('category = ?'); args.push(params.category) }
    if (params.q) { conditions.push('(title LIKE ? OR content LIKE ?)'); args.push(`%${params.q}%`, `%${params.q}%`) }
    const where = conditions.join(' AND ')
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM wiki_entries WHERE ${where}`).get(...args) as { c: number }).c
    const limit = Math.min(params.limit || 25, 100)
    const offset = params.offset || 0
    const entries = this.db.prepare(`SELECT * FROM wiki_entries WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(...args, limit, offset) as WikiRow[]
    return { entries, total }
  }

  getById(id: string): WikiRow | null {
    return this.db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(id) as WikiRow | undefined ?? null
  }

  getByIds(ids: string[]): WikiRow[] {
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(',')
    return this.db.prepare(`SELECT * FROM wiki_entries WHERE id IN (${placeholders})`).all(...ids) as WikiRow[]
  }

  create(e: WikiRow): void {
    this.db.prepare('INSERT INTO wiki_entries (id, owner_type, owner_id, title, content, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(e.id, e.owner_type, e.owner_id, e.title, e.content, e.category, e.tags)
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

  search(ownerType: string, ownerId: string, q: string): WikiRow[] {
    return this.db.prepare('SELECT * FROM wiki_entries WHERE owner_type = ? AND owner_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY match_count DESC LIMIT 20')
      .all(ownerType, ownerId, `%${q}%`, `%${q}%`) as WikiRow[]
  }

  incrementMatchCount(ids: string[]): void {
    if (ids.length === 0) return
    const placeholders = ids.map(() => '?').join(',')
    this.db.prepare(`UPDATE wiki_entries SET match_count = match_count + 1, last_matched_at = datetime('now') WHERE id IN (${placeholders})`).run(...ids)
  }

  stats(ownerType: string, ownerId: string): {
    total: number; neverMatched: number
    byCategory: Record<string, number>
    allTags: string[]
    staleEntries: WikiRow[]; topMatched: WikiRow[]
  } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM wiki_entries WHERE owner_type = ? AND owner_id = ?').get(ownerType, ownerId) as { c: number }).c
    const neverMatched = (this.db.prepare('SELECT COUNT(*) as c FROM wiki_entries WHERE owner_type = ? AND owner_id = ? AND match_count = 0').get(ownerType, ownerId) as { c: number }).c

    const catRows = this.db.prepare('SELECT category, COUNT(*) as c FROM wiki_entries WHERE owner_type = ? AND owner_id = ? GROUP BY category').all(ownerType, ownerId) as Array<{ category: string; c: number }>
    const byCategory = Object.fromEntries(catRows.map((r) => [r.category, r.c]))

    const tagRows = this.db.prepare('SELECT DISTINCT json_each.value as tag FROM wiki_entries, json_each(tags) WHERE owner_type = ? AND owner_id = ? ORDER BY tag').all(ownerType, ownerId) as Array<{ tag: string }>
    const allTags = tagRows.map((r) => r.tag)

    const staleEntries = this.db.prepare('SELECT * FROM wiki_entries WHERE owner_type = ? AND owner_id = ? AND match_count = 0 ORDER BY created_at ASC LIMIT 5').all(ownerType, ownerId) as WikiRow[]
    const topMatched = this.db.prepare('SELECT * FROM wiki_entries WHERE owner_type = ? AND owner_id = ? AND match_count > 0 ORDER BY match_count DESC LIMIT 5').all(ownerType, ownerId) as WikiRow[]

    return { total, neverMatched, byCategory, allTags, staleEntries, topMatched }
  }

  bulkCreate(entries: WikiRow[]): number {
    const stmt = this.db.prepare('INSERT INTO wiki_entries (id, owner_type, owner_id, title, content, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
    let count = 0
    for (const e of entries) {
      stmt.run(e.id, e.owner_type, e.owner_id, e.title, e.content, e.category, e.tags)
      count++
    }
    return count
  }
}
