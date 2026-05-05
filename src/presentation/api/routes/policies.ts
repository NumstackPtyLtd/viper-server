import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { PolicyRepository } from '../../../domain/ports/PolicyRepository.js'
import type { WikiRepository } from '../../../domain/ports/WikiRepository.js'
import type { PolicyResolver } from '../../../application/services/PolicyResolver.js'

interface Deps {
  policies: PolicyRepository
  wiki: WikiRepository
  policyResolver: PolicyResolver
  getOrgId: () => string
}

export function policyRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/policies', (c) => {
    const policies = deps.policies.list({
      org_id: deps.getOrgId(),
      resource_type: c.req.query('resource_type') || undefined,
      target_type: c.req.query('target_type') || undefined,
      target_id: c.req.query('target_id') || undefined,
    })
    return c.json({ policies: policies.map(parseConditions) })
  })

  app.get('/api/policies/preview', (c) => {
    const projectId = c.req.query('project_id')
    if (!projectId) return c.json({ error: 'project_id required' }, 400)
    const resolved = deps.policyResolver.resolveWikiForReview(deps.getOrgId(), projectId, [])
    return c.json({
      entries: resolved.map((r) => ({
        entry: { ...r.entry, tags: JSON.parse(r.entry.tags) },
        effect: r.effect,
        policy_name: r.policyName,
        priority: r.priority,
      })),
    })
  })

  app.get('/api/policies/:id', (c) => {
    const policy = deps.policies.getById(c.req.param('id'))
    if (!policy) return c.json({ error: 'Not found' }, 404)
    return c.json({ policy: parseConditions(policy) })
  })

  app.post('/api/policies', async (c) => {
    const body = await c.req.json()
    if (!body.name || typeof body.name !== 'string') return c.json({ error: 'name is required' }, 400)
    if (!body.resource_type || typeof body.resource_type !== 'string') return c.json({ error: 'resource_type is required' }, 400)
    if (!body.target_type || typeof body.target_type !== 'string') return c.json({ error: 'target_type is required' }, 400)
    const VALID_EFFECTS = ['enforce', 'suggest', 'deny']
    if (body.effect && !VALID_EFFECTS.includes(body.effect)) return c.json({ error: `effect must be one of: ${VALID_EFFECTS.join(', ')}` }, 400)
    const id = randomUUID()
    deps.policies.create({
      id,
      org_id: deps.getOrgId(),
      name: body.name,
      description: body.description ?? '',
      resource_type: body.resource_type,
      resource_id: body.resource_id ?? null,
      target_type: body.target_type,
      target_id: body.target_id ?? null,
      effect: body.effect ?? 'enforce',
      priority: body.priority ?? 0,
      conditions: JSON.stringify(body.conditions ?? {}),
      enabled: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return c.json({ status: 'ok', id })
  })

  app.put('/api/policies/:id', async (c) => {
    const body = await c.req.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.resource_type !== undefined) data.resource_type = body.resource_type
    if (body.resource_id !== undefined) data.resource_id = body.resource_id
    if (body.target_type !== undefined) data.target_type = body.target_type
    if (body.target_id !== undefined) data.target_id = body.target_id
    if (body.effect !== undefined) data.effect = body.effect
    if (body.priority !== undefined) data.priority = body.priority
    if (body.conditions !== undefined) data.conditions = JSON.stringify(body.conditions)
    if (body.enabled !== undefined) data.enabled = body.enabled ? 1 : 0
    deps.policies.update(c.req.param('id'), data)
    return c.json({ status: 'ok' })
  })

  app.delete('/api/policies/:id', (c) => {
    deps.policies.delete(c.req.param('id'))
    return c.json({ status: 'ok' })
  })

  return app
}

function parseConditions<T extends { conditions: string }>(row: T) {
  return { ...row, conditions: JSON.parse(row.conditions) }
}
