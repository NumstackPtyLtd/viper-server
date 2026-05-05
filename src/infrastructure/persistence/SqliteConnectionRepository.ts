import type Database from 'better-sqlite3'
import type { ConnectionRepository, ConnectionRow } from '../../domain/ports/ConnectionRepository.js'

export class SqliteConnectionRepository implements ConnectionRepository {
  constructor(private readonly db: Database.Database) {}

  list(orgId: string): ConnectionRow[] {
    return this.db.prepare('SELECT * FROM connections WHERE org_id = ? ORDER BY created_at DESC').all(orgId) as ConnectionRow[]
  }

  create(c: ConnectionRow): void {
    this.db.prepare('INSERT INTO connections (id, org_id, provider, name, base_url, config, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, c.org_id, c.provider, c.name, c.base_url, c.config, c.status)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM connections WHERE id = ?').run(id)
  }
}
