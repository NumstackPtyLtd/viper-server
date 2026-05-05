export interface PolicyRow {
  id: string
  org_id: string
  name: string
  description: string
  resource_type: string
  resource_id: string | null
  target_type: string
  target_id: string | null
  effect: string
  priority: number
  conditions: string
  enabled: number
  created_at: string
  updated_at: string
}

export interface PolicyListParams {
  org_id: string
  resource_type?: string
  target_type?: string
  target_id?: string
}

export interface PolicyRepository {
  list(params: PolicyListParams): PolicyRow[]
  getById(id: string): PolicyRow | null
  create(policy: PolicyRow): void
  update(id: string, data: Partial<PolicyRow>): void
  delete(id: string): void
  findForTarget(orgId: string, targetType: string, targetId: string | null, resourceType: string): PolicyRow[]
}
