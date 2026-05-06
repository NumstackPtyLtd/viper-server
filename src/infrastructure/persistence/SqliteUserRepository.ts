import type Database from 'better-sqlite3'
import type { UserRepository, UserRow, OrgRow, Theme } from '../../domain/ports/UserRepository.js'

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: Database.Database) {}

  createOrg(org: OrgRow): void {
    this.db.prepare('INSERT INTO organisations (id, name) VALUES (?, ?)').run(org.id, org.name)
  }

  createUser(user: UserRow): void {
    this.db.prepare('INSERT INTO users (id, org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, user.org_id, user.name, user.email, user.password_hash, user.role)
  }

  findByEmail(email: string): UserRow | null {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined ?? null
  }

  findById(id: string): UserRow | null {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined ?? null
  }

  getOrg(orgId: string): OrgRow | null {
    return this.db.prepare('SELECT * FROM organisations WHERE id = ?').get(orgId) as OrgRow | undefined ?? null
  }

  updateTheme(userId: string, theme: Theme): void {
    this.db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId)
  }
}
