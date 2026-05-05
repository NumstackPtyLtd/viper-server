export interface ReviewConfigRow {
  id: string; org_id: string; project_id: string | null
  tone: string; verbosity: string; focus_areas: string; custom_rules: string
  ignore_patterns: string; language: string; max_comments: number
  auto_resolve: number; pedantic: number; enabled: number
}

export interface ReviewConfigRepository {
  list(orgId: string): ReviewConfigRow[]
  create(config: ReviewConfigRow): void
  update(id: string, data: Partial<ReviewConfigRow>): void
}
