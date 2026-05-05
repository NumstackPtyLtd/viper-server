import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { webhookAuth } from './webhookAuth.js'

function createApp(secret: string) {
  const app = new Hono()
  app.use('*', webhookAuth(secret))
  app.post('/webhook', (c) => c.json({ ok: true }))
  return app
}

describe('webhookAuth', () => {
  const secret = 'test-secret'
  const app = createApp(secret)

  it('allows request with valid token', async () => {
    const res = await app.request('/webhook', {
      method: 'POST',
      headers: { 'X-Gitlab-Token': secret },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('rejects request with invalid token', async () => {
    const res = await app.request('/webhook', {
      method: 'POST',
      headers: { 'X-Gitlab-Token': 'wrong' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects request with missing token', async () => {
    const res = await app.request('/webhook', {
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })
})
