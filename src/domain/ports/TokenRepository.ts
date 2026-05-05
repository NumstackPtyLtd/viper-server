export interface TokenRow {
  id: string; org_id: string; provider: string; api_key: string
  model: string | null; label: string | null; is_default: number; created_at: string
}

export interface TokenRepository {
  list(orgId: string): TokenRow[]
  create(token: TokenRow): void
  update(id: string, data: Partial<TokenRow>): void
  delete(id: string): void
  clearDefaults(orgId: string): void
}
