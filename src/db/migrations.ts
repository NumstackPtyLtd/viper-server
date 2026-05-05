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
  {
    version: 2,
    description: 'Core tables',
    up: `
      CREATE TABLE IF NOT EXISTS organisations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model TEXT,
        label TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        full_path TEXT NOT NULL,
        external_project_id TEXT,
        default_branch TEXT NOT NULL DEFAULT 'main',
        language TEXT,
        last_review_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        mr_iid INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        source_branch TEXT NOT NULL,
        target_branch TEXT NOT NULL,
        author TEXT,
        provider TEXT NOT NULL,
        verdict TEXT,
        summary TEXT,
        findings_count INTEGER NOT NULL DEFAULT 0,
        critical_count INTEGER NOT NULL DEFAULT 0,
        warning_count INTEGER NOT NULL DEFAULT 0,
        suggestion_count INTEGER NOT NULL DEFAULT 0,
        praise_count INTEGER NOT NULL DEFAULT 0,
        url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        file TEXT NOT NULL,
        line INTEGER NOT NULL,
        severity TEXT NOT NULL,
        comment TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wiki_entries (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        tags TEXT NOT NULL DEFAULT '[]',
        scope TEXT NOT NULL DEFAULT '[]',
        match_count INTEGER NOT NULL DEFAULT 0,
        last_matched_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS review_configs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        tone TEXT NOT NULL DEFAULT 'friendly',
        verbosity TEXT NOT NULL DEFAULT 'balanced',
        focus_areas TEXT NOT NULL DEFAULT '[]',
        custom_rules TEXT NOT NULL DEFAULT '[]',
        ignore_patterns TEXT NOT NULL DEFAULT '[]',
        language TEXT NOT NULL DEFAULT 'English',
        max_comments INTEGER NOT NULL DEFAULT 20,
        auto_resolve INTEGER NOT NULL DEFAULT 1,
        pedantic INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1
      );
    `,
  },
  {
    version: 3,
    description: 'Wiki decoupling + policies',
    up: `
      CREATE TABLE wiki_entries_new (
        id TEXT PRIMARY KEY,
        owner_type TEXT NOT NULL DEFAULT 'org',
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        tags TEXT NOT NULL DEFAULT '[]',
        match_count INTEGER NOT NULL DEFAULT 0,
        last_matched_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO wiki_entries_new (id, owner_type, owner_id, title, content, category, tags, match_count, last_matched_at, created_at, updated_at)
      SELECT id, 'org', org_id, title, content, category, tags, match_count, last_matched_at, created_at, updated_at
      FROM wiki_entries;

      DROP TABLE wiki_entries;
      ALTER TABLE wiki_entries_new RENAME TO wiki_entries;

      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        target_type TEXT NOT NULL,
        target_id TEXT,
        effect TEXT NOT NULL DEFAULT 'enforce',
        priority INTEGER NOT NULL DEFAULT 0,
        conditions TEXT NOT NULL DEFAULT '{}',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_policies_org ON policies(org_id);
      CREATE INDEX idx_policies_target ON policies(org_id, target_type, target_id);
      CREATE INDEX idx_policies_resource ON policies(org_id, resource_type, resource_id);
      CREATE INDEX idx_policies_lookup ON policies(org_id, resource_type, target_type, target_id, enabled);
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
