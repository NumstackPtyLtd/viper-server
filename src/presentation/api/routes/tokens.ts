import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { TokenRepository } from '../../../domain/ports/TokenRepository.js'

interface AiRegistry {
  has(type: string): boolean
  get(type: string): { verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }> }
}

interface Deps { tokens: TokenRepository; aiRegistry: AiRegistry; getOrgId: () => string }

export function tokenRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/tokens', (c) => {
    const rows = deps.tokens.list(deps.getOrgId())
    const tokens = rows.map((t) => ({
      ...t,
      api_key_masked: t.api_key.slice(0, 8) + '...' + t.api_key.slice(-4),
      api_key: undefined,
    }))
    return c.json({ tokens })
  })

  app.post('/api/tokens', async (c) => {
    const body = await c.req.json()

    if (!body.provider || !body.api_key) {
      return c.json({ error: 'Provider and API key are required' }, 400)
    }

    // Verify the key with the provider before saving
    if (deps.aiRegistry.has(body.provider)) {
      const plugin = deps.aiRegistry.get(body.provider)
      const result = await plugin.verifyKey(body.api_key)
      if (!result.valid) {
        return c.json({ error: result.error || 'Invalid API key' }, 400)
      }
    }

    const id = randomUUID()
    if (body.is_default) deps.tokens.clearDefaults(deps.getOrgId())
    deps.tokens.create({
      id, org_id: deps.getOrgId(), provider: body.provider,
      api_key: body.api_key, model: body.model ?? null,
      label: body.label ?? null, is_default: body.is_default ? 1 : 0,
      created_at: new Date().toISOString(),
    })
    return c.json({ status: 'ok', id })
  })

  app.put('/api/tokens/:id', async (c) => {
    const body = await c.req.json()
    if (body.is_default) deps.tokens.clearDefaults(deps.getOrgId())
    deps.tokens.update(c.req.param('id'), { ...body, is_default: body.is_default ? 1 : 0 })
    return c.json({ status: 'ok' })
  })

  app.delete('/api/tokens/:id', (c) => {
    deps.tokens.delete(c.req.param('id'))
    return c.json({ status: 'ok' })
  })

  return app
}
