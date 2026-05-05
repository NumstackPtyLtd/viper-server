import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { ProjectRepository } from '../../../domain/ports/ProjectRepository.js'

interface Deps { projects: ProjectRepository; getOrgId: () => string }

export function projectRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/projects', (c) => {
    return c.json({ projects: deps.projects.list(deps.getOrgId()) })
  })

  app.post('/api/projects', async (c) => {
    const body = await c.req.json()
    const id = randomUUID()
    deps.projects.create({
      id, org_id: deps.getOrgId(), connection_id: body.connection_id ?? null,
      name: body.name, full_path: body.full_path,
      external_project_id: body.external_project_id ?? null,
      default_branch: body.default_branch ?? 'main',
      language: body.language ?? null, last_review_at: null,
      created_at: new Date().toISOString(),
    })
    return c.json({ status: 'ok', id })
  })

  app.delete('/api/projects/:id', (c) => {
    deps.projects.delete(c.req.param('id'))
    return c.json({ status: 'ok' })
  })

  return app
}
