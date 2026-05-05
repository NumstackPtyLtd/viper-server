import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { WikiRepository } from '../../../domain/ports/WikiRepository.js'

interface Deps { wiki: WikiRepository; getOrgId: () => string }

export function wikiRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/wiki', (c) => {
    const entries = deps.wiki.list({
      org_id: deps.getOrgId(),
      category: c.req.query('category') || undefined,
      project_id: c.req.query('project_id') || undefined,
    })
    return c.json({ entries: entries.map(parseJsonFields) })
  })

  app.get('/api/wiki/stats', (c) => {
    return c.json(deps.wiki.stats(deps.getOrgId()))
  })

  app.get('/api/wiki/search', (c) => {
    const q = c.req.query('q') || ''
    const results = deps.wiki.search(deps.getOrgId(), q)
    return c.json({ results: results.map(parseJsonFields) })
  })

  app.get('/api/wiki/:id', (c) => {
    const entry = deps.wiki.getById(c.req.param('id'))
    if (!entry) return c.json({ error: 'Not found' }, 404)
    return c.json({ entry: parseJsonFields(entry) })
  })

  app.post('/api/wiki', async (c) => {
    const body = await c.req.json()
    const id = randomUUID()
    deps.wiki.create({
      id, org_id: deps.getOrgId(), project_id: body.project_id ?? null,
      title: body.title, content: body.content, category: body.category ?? 'general',
      tags: JSON.stringify(body.tags ?? []), scope: JSON.stringify(body.scope ?? []),
      match_count: 0, last_matched_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    return c.json({ status: 'ok', id })
  })

  app.put('/api/wiki/:id', async (c) => {
    const body = await c.req.json()
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) data.content = body.content
    if (body.category !== undefined) data.category = body.category
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags)
    if (body.scope !== undefined) data.scope = JSON.stringify(body.scope)
    if (body.project_id !== undefined) data.project_id = body.project_id
    deps.wiki.update(c.req.param('id'), data)
    return c.json({ status: 'ok' })
  })

  app.delete('/api/wiki/:id', (c) => {
    deps.wiki.delete(c.req.param('id'))
    return c.json({ status: 'ok' })
  })

  app.post('/api/wiki/import', async (c) => {
    const body = await c.req.json()
    const orgId = deps.getOrgId()
    const entries = (body.entries ?? []).map((e: Record<string, unknown>) => ({
      id: randomUUID(), org_id: orgId, project_id: null,
      title: e.title as string, content: e.content as string,
      category: (e.category as string) ?? 'general',
      tags: JSON.stringify(e.tags ?? []), scope: JSON.stringify(e.scope ?? []),
      match_count: 0, last_matched_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }))
    const count = deps.wiki.bulkCreate(entries)
    return c.json({ status: 'ok', count })
  })

  return app
}

function parseJsonFields<T extends { tags: string; scope: string }>(row: T) {
  return {
    ...row,
    tags: JSON.parse(row.tags),
    scope: JSON.parse(row.scope),
  }
}
