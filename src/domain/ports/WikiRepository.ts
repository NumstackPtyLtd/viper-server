export interface WikiRow {
  id: string; org_id: string; project_id: string | null; title: string
  content: string; category: string; tags: string; scope: string
  match_count: number; last_matched_at: string | null
  created_at: string; updated_at: string
}

export interface WikiListParams {
  org_id: string; category?: string; project_id?: string
}

export interface WikiRepository {
  list(params: WikiListParams): WikiRow[]
  getById(id: string): WikiRow | null
  create(entry: WikiRow): void
  update(id: string, data: Partial<WikiRow>): void
  delete(id: string): void
  search(orgId: string, q: string): WikiRow[]
  stats(orgId: string): {
    total: number; orgWide: number; neverMatched: number
    byCategory: Record<string, number>; byProject: Record<string, number>
    projects: Array<{ id: string; name: string }>
    staleEntries: WikiRow[]; topMatched: WikiRow[]
  }
  bulkCreate(entries: WikiRow[]): number
}
