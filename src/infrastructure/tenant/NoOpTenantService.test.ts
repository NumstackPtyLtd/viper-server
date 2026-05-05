import { describe, it, expect } from 'vitest'
import { NoOpTenantService } from './NoOpTenantService.js'

describe('NoOpTenantService', () => {
  const svc = new NoOpTenantService()

  it('returns null for review scoping (no filtering)', () => {
    expect(svc.scopeReviewList('org-1')).toBeNull()
  })

  it('does not throw on project access (all allowed)', () => {
    expect(() => svc.verifyProjectAccess(null, 'org-1')).not.toThrow()
    expect(() => svc.verifyProjectAccess('org-2', 'org-1')).not.toThrow()
  })

  it('returns userOrgId for creation', () => {
    expect(svc.resolveOrgForCreation('org-1')).toBe('org-1')
  })
})
