export interface ConnectionRow {
  id: string; org_id: string; provider: string; name: string
  base_url: string | null; config: string; status: string; created_at: string
}

export interface ConnectionRepository {
  list(orgId: string): ConnectionRow[]
  create(conn: ConnectionRow): void
  delete(id: string): void
}
