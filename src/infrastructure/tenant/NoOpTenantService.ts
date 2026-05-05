import type { TenantService } from '../../application/ports/TenantService.js'

/**
 * Single-tenant implementation — no org scoping.
 *
 * Used by default in the open-source server. All reviews
 * are visible, no access checks, creation uses the user's org.
 */
export class NoOpTenantService implements TenantService {
  scopeReviewList(_userOrgId: string): string | null {
    return null
  }

  verifyProjectAccess(_projectOrgId: string | null, _userOrgId: string): void {
    // No-op — all access allowed in single-tenant mode
  }

  resolveOrgForCreation(userOrgId: string): string {
    return userOrgId
  }
}
