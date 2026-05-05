import type { PolicyRepository, PolicyRow } from '../../domain/ports/PolicyRepository.js'
import type { WikiRepository, WikiRow } from '../../domain/ports/WikiRepository.js'
import type { GlobMatcher } from '../../domain/ports/GlobMatcher.js'

export interface ResolvedWiki {
  entry: WikiRow
  effect: 'enforce' | 'suggest'
  policyName: string
  priority: number
}

export class PolicyResolver {
  constructor(
    private readonly policies: PolicyRepository,
    private readonly wiki: WikiRepository,
    private readonly glob: GlobMatcher
  ) {}

  resolveWikiForReview(orgId: string, projectId: string, changedFiles: string[]): ResolvedWiki[] {
    let policies: PolicyRow[]
    try {
      policies = this.policies.findForTarget(orgId, 'project', projectId, 'wiki')
    } catch {
      return []
    }
    const applicable = policies.filter((p) => this.matchesConditions(p, changedFiles))

    const denied = new Set<string>()
    for (const p of applicable) {
      if (p.effect === 'deny' && p.resource_id) denied.add(p.resource_id)
    }

    const wikiPolicyMap = new Map<string, PolicyRow>()
    for (const p of applicable) {
      if (p.effect === 'deny' || !p.resource_id) continue
      if (denied.has(p.resource_id)) continue
      if (!wikiPolicyMap.has(p.resource_id)) {
        wikiPolicyMap.set(p.resource_id, p)
      }
    }

    const wikiIds = Array.from(wikiPolicyMap.keys())
    let entries: WikiRow[]
    try {
      entries = this.wiki.getByIds(wikiIds)
    } catch {
      return []
    }
    const entryMap = new Map(entries.map((e) => [e.id, e]))

    const result: ResolvedWiki[] = []
    for (const [wikiId, policy] of wikiPolicyMap) {
      const entry = entryMap.get(wikiId)
      if (!entry) continue
      result.push({
        entry,
        effect: policy.effect as 'enforce' | 'suggest',
        policyName: policy.name,
        priority: policy.priority,
      })
    }

    return result.sort((a, b) => b.priority - a.priority)
  }

  private matchesConditions(policy: PolicyRow, changedFiles: string[]): boolean {
    const conditions = JSON.parse(policy.conditions) as { scope?: string[]; branches?: string[] }
    if (!conditions.scope || conditions.scope.length === 0) return true
    return changedFiles.some((file) =>
      conditions.scope!.some((pattern) => this.glob.match(file, pattern))
    )
  }
}
