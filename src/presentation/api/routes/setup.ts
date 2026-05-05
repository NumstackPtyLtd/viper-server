import { Hono } from 'hono'
import { html } from 'hono/html'
import type { SettingsRepository } from '../../../domain/ports/SettingsRepository.js'

interface SetupRouteDeps {
  settings: SettingsRepository
  isConfigured: () => boolean
  reload: () => { configured: boolean }
  vcsSchemas: () => Array<{ type: string; name: string }>
  aiSchemas: () => Array<{ type: string; name: string; models: Array<{ id: string; label: string; default?: boolean }> }>
}

export function setupRoutes(deps: SetupRouteDeps): Hono {
  const app = new Hono()

  app.get('/setup', (c) => {
    if (deps.isConfigured()) {
      return c.redirect('/health')
    }

    const vcsOptions = deps.vcsSchemas().map((p) => `<option value="${p.type}">${p.name}</option>`).join('')
    const aiOptions = deps.aiSchemas().map((p) => `<option value="${p.type}">${p.name}</option>`).join('')
    const modelOptions = deps.aiSchemas().flatMap((p) =>
      p.models.map((m) => `<option value="${m.id}" data-provider="${p.type}" ${m.default ? 'selected' : ''}>${m.label}</option>`)
    ).join('')

    return c.html(html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Viper — Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .setup { max-width: 480px; width: 100%; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; color: #fff; }
    .sub { color: #888; font-size: 0.85rem; margin-bottom: 2rem; }
    fieldset { border: 1px solid #222; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
    legend { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #888; padding: 0 0.5rem; }
    label { display: block; font-size: 0.8rem; color: #aaa; margin: 0.75rem 0 0.25rem; }
    label:first-child { margin-top: 0; }
    input, select { width: 100%; padding: 0.5rem 0.75rem; background: #111; border: 1px solid #333; border-radius: 4px; color: #fff; font-size: 0.85rem; }
    input:focus, select:focus { outline: none; border-color: #4f8; }
    button { width: 100%; padding: 0.7rem; background: #4f8; color: #000; border: none; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; margin-top: 0.5rem; }
    button:hover { background: #3e7; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: #f44; font-size: 0.8rem; margin-top: 0.5rem; display: none; }
    .success { text-align: center; padding: 3rem 1rem; }
    .success h2 { color: #4f8; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="setup" id="form-view">
    <h1>Viper Setup</h1>
    <p class="sub">Configure your VCS and AI providers to get started.</p>
    <form id="setup-form">
      <fieldset>
        <legend>VCS Provider</legend>
        <label for="vcs_provider_type">Provider</label>
        <select id="vcs_provider_type" name="vcs_provider_type" required>${vcsOptions}</select>
        <label for="vcs_url">URL</label>
        <input id="vcs_url" name="vcs_url" type="url" placeholder="https://api.github.com" required>
        <label for="vcs_token">Token</label>
        <input id="vcs_token" name="vcs_token" type="password" placeholder="Personal access token" required>
        <label for="webhook_secret">Webhook Secret</label>
        <input id="webhook_secret" name="webhook_secret" type="password" placeholder="Shared secret for webhook auth" required>
      </fieldset>
      <fieldset>
        <legend>AI Provider</legend>
        <label for="ai_provider_type">Provider</label>
        <select id="ai_provider_type" name="ai_provider_type" required>${aiOptions}</select>
        <label for="ai_api_key">API Key</label>
        <input id="ai_api_key" name="ai_api_key" type="password" placeholder="API key" required>
        <label for="ai_model">Model</label>
        <select id="ai_model" name="ai_model">${modelOptions}</select>
      </fieldset>
      <div class="error" id="error"></div>
      <button type="submit">Save &amp; Activate</button>
    </form>
  </div>
  <div class="setup success" id="success-view" style="display:none">
    <h2>Ready</h2>
    <p>Viper is configured and listening for webhooks.</p>
    <p style="margin-top:1rem;color:#888;font-size:0.8rem;">Point your VCS webhook to <code>/webhook</code></p>
  </div>
  <script>
    document.getElementById('setup-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = e.target.querySelector('button')
      const err = document.getElementById('error')
      btn.disabled = true
      err.style.display = 'none'
      const data = Object.fromEntries(new FormData(e.target))
      try {
        let res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        if (!res.ok) throw new Error(await res.text())
        res = await fetch('/api/reload', { method: 'POST' })
        const result = await res.json()
        if (!result.configured) throw new Error('Configuration saved but providers failed to load. Check your tokens.')
        document.getElementById('form-view').style.display = 'none'
        document.getElementById('success-view').style.display = 'block'
      } catch (ex) {
        err.textContent = ex.message
        err.style.display = 'block'
        btn.disabled = false
      }
    })
  </script>
</body>
</html>`)
  })

  return app
}
