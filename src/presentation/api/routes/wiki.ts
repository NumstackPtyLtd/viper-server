import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { WikiRepository } from '../../../domain/ports/WikiRepository.js'

interface Deps { wiki: WikiRepository; getOrgId: () => string }

export function wikiRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/wiki', (c) => {
    const ownerType = c.req.query('owner_type') || 'org'
    const ownerId = c.req.query('owner_id') || deps.getOrgId()
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined
    const offset = c.req.query('offset') ? Number(c.req.query('offset')) : undefined
    const result = deps.wiki.list({
      owner_type: ownerType,
      owner_id: ownerId,
      category: c.req.query('category') || undefined,
      q: c.req.query('q') || undefined,
      limit,
      offset,
    })
    return c.json({ entries: result.entries.map(parseJsonFields), total: result.total })
  })

  app.get('/api/wiki/stats', (c) => {
    const ownerType = c.req.query('owner_type') || 'org'
    const ownerId = c.req.query('owner_id') || deps.getOrgId()
    return c.json(deps.wiki.stats(ownerType, ownerId))
  })

  app.get('/api/wiki/search', (c) => {
    const ownerType = c.req.query('owner_type') || 'org'
    const ownerId = c.req.query('owner_id') || deps.getOrgId()
    const q = c.req.query('q') || ''
    const results = deps.wiki.search(ownerType, ownerId, q)
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
      id,
      owner_type: body.owner_type ?? 'org',
      owner_id: body.owner_id ?? deps.getOrgId(),
      title: body.title, content: body.content, category: body.category ?? 'general',
      tags: JSON.stringify(body.tags ?? []),
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
    if (body.owner_type !== undefined) data.owner_type = body.owner_type
    if (body.owner_id !== undefined) data.owner_id = body.owner_id
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
      id: randomUUID(), owner_type: 'org' as const, owner_id: orgId,
      title: e.title as string, content: e.content as string,
      category: (e.category as string) ?? 'general',
      tags: JSON.stringify(e.tags ?? []),
      match_count: 0, last_matched_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }))
    const count = deps.wiki.bulkCreate(entries)
    return c.json({ status: 'ok', count })
  })

  return app
}

function parseJsonFields<T extends { tags: string }>(row: T) {
  return {
    ...row,
    tags: JSON.parse(row.tags),
  }
}
