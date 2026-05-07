export type Theme = 'light' | 'dark' | 'system'

export interface UserRow {
  id: string; org_id: string; name: string; email: string
  password_hash: string; role: string; theme: Theme; created_at: string
}

export interface OrgRow {
  id: string; name: string; created_at: string
}

export interface UserRepository {
  createOrg(org: OrgRow): void
  createUser(user: UserRow): void
  findByEmail(email: string): UserRow | null
  findById(id: string): UserRow | null
  getOrg(orgId: string): OrgRow | null
  updateTheme(userId: string, theme: Theme): void
}
