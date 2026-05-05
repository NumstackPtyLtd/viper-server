import type Database from 'better-sqlite3'
import type { TokenRepository, TokenRow } from '../../domain/ports/TokenRepository.js'

export class SqliteTokenRepository implements TokenRepository {
  constructor(private readonly db: Database.Database) {}

  list(orgId: string): TokenRow[] {
    return this.db.prepare('SELECT * FROM tokens WHERE org_id = ? ORDER BY created_at DESC').all(orgId) as TokenRow[]
  }

  getDefault(orgId: string): TokenRow | null {
    return this.db.prepare('SELECT * FROM tokens WHERE org_id = ? AND is_default = 1 LIMIT 1').get(orgId) as TokenRow | undefined
      ?? this.db.prepare('SELECT * FROM tokens WHERE org_id = ? ORDER BY created_at ASC LIMIT 1').get(orgId) as TokenRow | undefined
      ?? null
  }

  create(t: TokenRow): void {
    this.db.prepare('INSERT INTO tokens (id, org_id, provider, api_key, model, label, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(t.id, t.org_id, t.provider, t.api_key, t.model, t.label, t.is_default)
  }

  update(id: string, data: Partial<TokenRow>): void {
    const sets: string[] = []
    const args: unknown[] = []
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') { sets.push(`${key} = ?`); args.push(val) }
    }
    if (sets.length === 0) return
    args.push(id)
    this.db.prepare(`UPDATE tokens SET ${sets.join(', ')} WHERE id = ?`).run(...args)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM tokens WHERE id = ?').run(id)
  }

  clearDefaults(orgId: string): void {
    this.db.prepare('UPDATE tokens SET is_default = 0 WHERE org_id = ?').run(orgId)
  }
}
