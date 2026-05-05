import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { webhookAuth } from './webhookAuth.js'
import type { VcsPlugin } from '../../../application/ports/VcsPlugin.js'

function mockVcsPlugin(authHeader = 'x-gitlab-token'): VcsPlugin {
  return {
    type: 'test',
    name: 'Test',
    description: 'Test provider',
    webhookAuthHeader: authHeader,
    configSchema: [],
    createProvider: () => { throw new Error('not implemented') },
    parseWebhookPayload: () => null,
    validateWebhookAuth: (headers, secret) => headers[authHeader] === secret,
  }
}

function createApp(secret: string, plugin?: VcsPlugin) {
  const app = new Hono()
  app.use('*', webhookAuth(plugin ?? mockVcsPlugin(), secret))
  app.post('/webhook', (c) => c.json({ ok: true }))
  return app
}

describe('webhookAuth', () => {
  const secret = 'test-secret'
  const app = createApp(secret)

  it('allows request with valid token', async () => {
    const res = await app.request('/webhook', {
      method: 'POST',
      headers: { 'x-gitlab-token': secret },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('rejects request with invalid token', async () => {
    const res = await app.request('/webhook', {
      method: 'POST',
      headers: { 'x-gitlab-token': 'wrong' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects request with missing token', async () => {
    const res = await app.request('/webhook', {
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })

  it('works with different auth headers', async () => {
    const ghPlugin = mockVcsPlugin('x-hub-signature-256')
    const ghApp = createApp('gh-secret', ghPlugin)

    const res = await ghApp.request('/webhook', {
      method: 'POST',
      headers: { 'x-hub-signature-256': 'gh-secret' },
    })
    expect(res.status).toBe(200)
  })
})
