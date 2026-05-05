import type Database from 'better-sqlite3'

const MIGRATIONS = [
  {
    version: 1,
    description: 'Settings table',
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        is_secret INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
]

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null }
  const current = currentVersion?.v ?? 0

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      db.exec(migration.up)
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
    }
  }
}
