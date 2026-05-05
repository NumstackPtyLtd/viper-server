export interface ProjectRow {
  id: string; org_id: string; connection_id: string | null; name: string
  full_path: string; external_project_id: string | null; default_branch: string
  language: string | null; last_review_at: string | null; created_at: string
}

export interface ProjectRepository {
  list(orgId: string): ProjectRow[]
  create(project: ProjectRow): void
  delete(id: string): void
}
