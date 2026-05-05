import { Hono } from 'hono'
import type { SettingsRepository } from '../../../domain/ports/SettingsRepository.js'

interface SettingsRouteDeps {
  settings: SettingsRepository
}

const SECRET_KEYS = new Set(['vcs_token', 'vcs_private_key', 'ai_api_key', 'webhook_secret'])

export function settingsRoutes(deps: SettingsRouteDeps): Hono {
  const app = new Hono()

  /** List all settings (secrets are masked). */
  app.get('/api/settings', (c) => {
    const all = deps.settings.all()
    const masked = all.map((s) => ({
      key: s.key,
      value: s.isSecret ? '••••••••' : s.value,
      isSecret: s.isSecret,
    }))
    return c.json({ settings: masked })
  })

  /** Get a single setting by key. */
  app.get('/api/settings/:key', (c) => {
    const key = c.req.param('key')
    const entry = deps.settings.all().find((s) => s.key === key)
    if (!entry) return c.json({ error: 'Setting not found' }, 404)
    return c.json({
      key: entry.key,
      value: entry.isSecret ? '••••••••' : entry.value,
      isSecret: entry.isSecret,
    })
  })

  /** Create or update a setting. */
  app.put('/api/settings/:key', async (c) => {
    const key = c.req.param('key')
    const body = await c.req.json<{ value: string }>()
    if (!body.value && body.value !== '') {
      return c.json({ error: 'value is required' }, 400)
    }
    const isSecret = SECRET_KEYS.has(key)
    deps.settings.set(key, body.value, isSecret)
    return c.json({ ok: true, key })
  })

  /** Bulk upsert settings. */
  app.put('/api/settings', async (c) => {
    const body = await c.req.json<Record<string, string>>()
    for (const [key, value] of Object.entries(body)) {
      const isSecret = SECRET_KEYS.has(key)
      deps.settings.set(key, value, isSecret)
    }
    return c.json({ ok: true, keys: Object.keys(body) })
  })

  /** Delete a setting. */
  app.delete('/api/settings/:key', (c) => {
    const key = c.req.param('key')
    deps.settings.delete(key)
    return c.json({ ok: true })
  })

  return app
}
