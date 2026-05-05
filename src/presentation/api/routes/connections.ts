import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { ConnectionRepository } from '../../../domain/ports/ConnectionRepository.js'

interface Deps { connections: ConnectionRepository; getOrgId: () => string }

export function connectionRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/connections', (c) => {
    return c.json({ connections: deps.connections.list(deps.getOrgId()) })
  })

  app.post('/api/connections', async (c) => {
    const body = await c.req.json()
    const id = randomUUID()
    deps.connections.create({
      id, org_id: deps.getOrgId(), provider: body.provider,
      name: body.name, base_url: body.base_url ?? null,
      config: JSON.stringify(body.config ?? {}),
      status: 'active', created_at: new Date().toISOString(),
    })
    return c.json({ status: 'ok', id })
  })

  app.delete('/api/connections/:id', (c) => {
    deps.connections.delete(c.req.param('id'))
    return c.json({ status: 'ok' })
  })

  return app
}
