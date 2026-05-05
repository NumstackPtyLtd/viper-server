import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { ReviewConfigRepository } from '../../../domain/ports/ReviewConfigRepository.js'

interface Deps { reviewConfigs: ReviewConfigRepository; getOrgId: () => string }

export function reviewConfigRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/review-config', (c) => {
    const configs = deps.reviewConfigs.list(deps.getOrgId()).map(parseJsonFields)
    return c.json({ configs })
  })

  app.post('/api/review-config', async (c) => {
    const body = await c.req.json()
    const id = randomUUID()
    deps.reviewConfigs.create({
      id, org_id: deps.getOrgId(), project_id: body.project_id ?? null,
      tone: body.tone ?? 'friendly', verbosity: body.verbosity ?? 'balanced',
      focus_areas: JSON.stringify(body.focus_areas ?? []),
      custom_rules: JSON.stringify(body.custom_rules ?? []),
      ignore_patterns: JSON.stringify(body.ignore_patterns ?? []),
      language: body.language ?? 'English', max_comments: body.max_comments ?? 20,
      auto_resolve: body.auto_resolve !== false ? 1 : 0,
      pedantic: body.pedantic ? 1 : 0, enabled: body.enabled !== false ? 1 : 0,
    })
    return c.json({ status: 'ok', id })
  })

  app.put('/api/review-config/:id', async (c) => {
    const body = await c.req.json()
    const data: Record<string, unknown> = {}
    if (body.tone !== undefined) data.tone = body.tone
    if (body.verbosity !== undefined) data.verbosity = body.verbosity
    if (body.focus_areas !== undefined) data.focus_areas = JSON.stringify(body.focus_areas)
    if (body.custom_rules !== undefined) data.custom_rules = JSON.stringify(body.custom_rules)
    if (body.ignore_patterns !== undefined) data.ignore_patterns = JSON.stringify(body.ignore_patterns)
    if (body.language !== undefined) data.language = body.language
    if (body.max_comments !== undefined) data.max_comments = body.max_comments
    if (body.auto_resolve !== undefined) data.auto_resolve = body.auto_resolve ? 1 : 0
    if (body.pedantic !== undefined) data.pedantic = body.pedantic ? 1 : 0
    if (body.enabled !== undefined) data.enabled = body.enabled ? 1 : 0
    deps.reviewConfigs.update(c.req.param('id'), data)
    return c.json({ status: 'ok' })
  })

  return app
}

function parseJsonFields<T extends { focus_areas: string; custom_rules: string; ignore_patterns: string; auto_resolve: number; pedantic: number; enabled: number }>(row: T) {
  return {
    ...row,
    focus_areas: JSON.parse(row.focus_areas),
    custom_rules: JSON.parse(row.custom_rules),
    ignore_patterns: JSON.parse(row.ignore_patterns),
    auto_resolve: row.auto_resolve === 1,
    pedantic: row.pedantic === 1,
    enabled: row.enabled === 1,
  }
}
