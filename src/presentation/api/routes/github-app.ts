import { Hono } from 'hono'
import { createSign } from 'crypto'
import type { SettingsRepository } from '../../../domain/ports/SettingsRepository.js'

interface Deps {
  settings: SettingsRepository
}

function signJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })).toString('base64url')
  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(privateKey, 'base64url')
  return `${header}.${payload}.${signature}`
}

async function ghFetch<T>(path: string, jwt: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github.v3+json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res.json() as Promise<T>
}

export function githubAppRoutes(deps: Deps): Hono {
  const app = new Hono()

  /** Get GitHub App status: is it configured? What's the install URL? */
  app.get('/api/github-app/status', async (c) => {
    const appId = deps.settings.get('vcs_app_id')
    const privateKey = deps.settings.get('vcs_private_key')
    const providerType = deps.settings.get('vcs_provider_type')

    if (providerType !== 'github' || !appId || !privateKey) {
      return c.json({ configured: false, app_slug: null, install_url: null })
    }

    try {
      const jwt = signJwt(appId, privateKey)
      const appData = await ghFetch<{ slug: string }>('/app', jwt)
      return c.json({
        configured: true,
        app_slug: appData.slug,
        install_url: `https://github.com/apps/${appData.slug}/installations/new`,
      })
    } catch {
      return c.json({ configured: false, app_slug: null, install_url: null })
    }
  })

  /** List current installations of the GitHub App. */
  app.get('/api/github-app/installations', async (c) => {
    const appId = deps.settings.get('vcs_app_id')
    const privateKey = deps.settings.get('vcs_private_key')
    if (!appId || !privateKey) return c.json({ installations: [] })

    try {
      const jwt = signJwt(appId, privateKey)
      const installs = await ghFetch<Array<{ id: number; account: { login: string }; target_type: string; repository_selection: string }>>('/app/installations', jwt)
      return c.json({
        installations: installs.map((i) => ({
          id: i.id,
          account: i.account.login,
          type: i.target_type,
          selection: i.repository_selection,
        })),
      })
    } catch {
      return c.json({ installations: [] })
    }
  })

  /** List repos accessible to a specific installation. */
  app.get('/api/github-app/repos/:installationId', async (c) => {
    const appId = deps.settings.get('vcs_app_id')
    const privateKey = deps.settings.get('vcs_private_key')
    if (!appId || !privateKey) return c.json({ repos: [] })

    const installationId = c.req.param('installationId')

    try {
      const jwt = signJwt(appId, privateKey)
      const tokenRes = await ghFetch<{ token: string }>(`/app/installations/${installationId}/access_tokens`, jwt, 'POST')
      const reposRes = await fetch('https://api.github.com/installation/repositories?per_page=100', {
        headers: { Authorization: `Bearer ${tokenRes.token}`, Accept: 'application/vnd.github.v3+json' },
      })
      const data = await reposRes.json() as { repositories: Array<{ id: number; name: string; full_name: string; default_branch: string; language: string | null; private: boolean }> }
      return c.json({
        repos: (data.repositories || []).map((r) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          default_branch: r.default_branch,
          language: r.language,
          private: r.private,
        })),
      })
    } catch {
      return c.json({ repos: [] })
    }
  })

  /** Save installation ID to settings (called after GitHub redirects back). */
  app.post('/api/github-app/save-installation', async (c) => {
    const body = await c.req.json() as { installation_id: string }
    if (!body.installation_id) return c.json({ error: 'installation_id required' }, 400)
    deps.settings.set('vcs_installation_id', body.installation_id)
    return c.json({ status: 'ok' })
  })

  return app
}
