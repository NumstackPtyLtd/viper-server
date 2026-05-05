export interface WikiRow {
  id: string
  owner_type: string
  owner_id: string
  title: string
  content: string
  category: string
  tags: string
  match_count: number
  last_matched_at: string | null
  created_at: string
  updated_at: string
}

export interface WikiListParams {
  owner_type: string
  owner_id: string
  category?: string
  q?: string
  limit?: number
  offset?: number
}

export interface WikiListResult {
  entries: WikiRow[]
  total: number
}

export interface WikiRepository {
  list(params: WikiListParams): WikiListResult
  getById(id: string): WikiRow | null
  getByIds(ids: string[]): WikiRow[]
  create(entry: WikiRow): void
  update(id: string, data: Partial<WikiRow>): void
  delete(id: string): void
  search(ownerType: string, ownerId: string, q: string): WikiRow[]
  incrementMatchCount(ids: string[]): void
  stats(ownerType: string, ownerId: string): {
    total: number
    neverMatched: number
    byCategory: Record<string, number>
    allTags: string[]
    staleEntries: WikiRow[]
    topMatched: WikiRow[]
  }
  bulkCreate(entries: WikiRow[]): number
}
