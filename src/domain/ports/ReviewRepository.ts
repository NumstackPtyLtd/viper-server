export interface ReviewRow {
  id: string; org_id: string; project_id: string | null; mr_iid: number
  title: string; description: string | null; source_branch: string; target_branch: string
  author: string | null; provider: string; verdict: string | null; summary: string | null
  findings_count: number; critical_count: number; warning_count: number
  suggestion_count: number; praise_count: number; url: string | null; created_at: string
}

export interface FindingRow {
  id: string; review_id: string; file: string; line: number; severity: string; comment: string
}

export interface ReviewListParams {
  org_id: string; limit?: number; offset?: number; provider?: string
  severity?: string; verdict?: string; project_id?: string; q?: string
}

export interface ReviewRepository {
  create(review: ReviewRow): void
  addFindings(findings: FindingRow[]): void
  list(params: ReviewListParams): { reviews: ReviewRow[]; total: number }
  getById(id: string): ReviewRow | null
  getFindings(reviewId: string): FindingRow[]
  stats(orgId: string): { total: number; thisWeek: number; criticals: number; totalFindings: number }
}
