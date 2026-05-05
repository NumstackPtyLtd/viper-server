import type Database from 'better-sqlite3'
import type { SettingsRepository } from '../../domain/ports/SettingsRepository.js'

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  getMany(keys: string[]): Record<string, string> {
    if (keys.length === 0) return {}
    const placeholders = keys.map(() => '?').join(',')
    const rows = this.db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...keys) as Array<{ key: string; value: string }>
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  }

  set(key: string, value: string, isSecret = false): void {
    this.db.prepare(
      'INSERT INTO settings (key, value, is_secret) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_secret = excluded.is_secret'
    ).run(key, value, isSecret ? 1 : 0)
  }

  delete(key: string): void {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  }

  all(): Array<{ key: string; value: string; isSecret: boolean }> {
    const rows = this.db.prepare('SELECT key, value, is_secret FROM settings').all() as Array<{ key: string; value: string; is_secret: number }>
    return rows.map((r) => ({ key: r.key, value: r.value, isSecret: r.is_secret === 1 }))
  }
}
