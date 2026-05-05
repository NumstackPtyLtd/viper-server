import type Database from 'better-sqlite3'
import type { ProjectRepository, ProjectRow } from '../../domain/ports/ProjectRepository.js'

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: Database.Database) {}

  list(orgId: string): ProjectRow[] {
    return this.db.prepare('SELECT * FROM projects WHERE org_id = ? ORDER BY name ASC').all(orgId) as ProjectRow[]
  }

  create(p: ProjectRow): void {
    this.db.prepare('INSERT INTO projects (id, org_id, connection_id, name, full_path, external_project_id, default_branch, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(p.id, p.org_id, p.connection_id, p.name, p.full_path, p.external_project_id, p.default_branch, p.language)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  }
}
