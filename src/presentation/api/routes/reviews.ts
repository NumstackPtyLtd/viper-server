import { Hono } from 'hono'
import type { ReviewRepository } from '../../../domain/ports/ReviewRepository.js'

interface Deps { reviews: ReviewRepository; getOrgId: () => string }

export function reviewRoutes(deps: Deps): Hono {
  const app = new Hono()

  app.get('/api/reviews', (c) => {
    const params = {
      org_id: deps.getOrgId(),
      limit: Number(c.req.query('limit') || 10),
      offset: Number(c.req.query('offset') || 0),
      provider: c.req.query('provider') || undefined,
      severity: c.req.query('severity') || undefined,
      verdict: c.req.query('verdict') || undefined,
      project_id: c.req.query('project_id') || undefined,
      q: c.req.query('q') || undefined,
    }
    return c.json(deps.reviews.list(params))
  })

  app.get('/api/reviews/stats/summary', (c) => {
    return c.json(deps.reviews.stats(deps.getOrgId()))
  })

  app.get('/api/reviews/:id', (c) => {
    const review = deps.reviews.getById(c.req.param('id'))
    if (!review) return c.json({ error: 'Not found' }, 404)
    const findings = deps.reviews.getFindings(review.id)
    return c.json({ review, findings })
  })

  return app
}
