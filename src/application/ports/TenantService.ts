/**
 * Tenant isolation port.
 *
 * Open-source: uses NoOpTenantService (single-tenant, no scoping).
 * Cloud: installs CloudTenantService which scopes all data
 * by org_id, enforces access guards, and adds usage limits.
 *
 * The server provides the hook; the implementation is pluggable.
 */
export interface TenantService {
  /**
   * Scope a review listing query.
   * Returns orgId to filter by, or null for no filtering (single-tenant).
   */
  scopeReviewList(userOrgId: string): string | null

  /**
   * Verify the user has access to this project's reviews.
   * Throws if access is denied.
   * No-op in single-tenant mode.
   */
  verifyProjectAccess(projectOrgId: string | null, userOrgId: string): void

  /**
   * Get the org_id to assign when registering a project.
   * Returns userOrgId in multi-tenant, or the single org in single-tenant.
   */
  resolveOrgForCreation(userOrgId: string): string
}
