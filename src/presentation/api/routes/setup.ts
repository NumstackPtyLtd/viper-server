import { Hono } from 'hono'
import { html, raw } from 'hono/html'

interface SetupRouteDeps {
  isConfigured: () => boolean
}

const LOGO_SVG = `<svg width="32" height="32" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill="#10b981" d="M212.745 143.991V88.745C212.745 41.942 174.804 4 128 4S43.255 41.942 43.255 88.745v55.246c-10.58 6.514-17.636 18.199-17.636 31.535 0 20.441 16.57 37.011 37.011 37.011h130.74c20.441 0 37.011-16.57 37.011-37.011.001-13.336-7.055-25.021-17.636-31.535z"/>
  <path fill="#059669" opacity="0.3" d="M212.745 143.991V88.745C212.745 41.942 174.804 4 128 4c-1.68 0-3.344.062-5 .159 44.475 2.59 79.746 39.463 79.746 84.587v55.246c10.58 6.514 17.636 18.199 17.636 31.535 0 20.441-16.57 37.011-37.011 37.011h10c20.441 0 37.011-16.57 37.011-37.011 0-13.337-7.056-25.022-17.637-31.536z"/>
  <path fill="#34d399" opacity="0.2" d="M43.255 143.991V88.745C43.255 41.942 81.196 4 128 4c1.68 0 3.344.062 5 .159-44.475 2.59-79.745 39.463-79.745 84.587v55.246c-10.58 6.514-17.636 18.199-17.636 31.535 0 20.441 16.57 37.011 37.011 37.011h-10c-20.441 0-37.011-16.57-37.011-37.011-.001-13.337 7.055-25.022 17.636-31.536z"/>
  <path fill="#059669" d="M135.892 227.072v-14.534h-15.784v14.534l-10.279 11.869A7.894 7.894 0 0 0 115.791 252a7.87 7.87 0 0 0 5.969-2.726l6.24-7.204 6.24 7.204a7.892 7.892 0 1 0 11.931-10.334z"/>
  <path fill="#0f1117" d="M72 138.896a10 10 0 0 1-10-10v-12a10 10 0 0 1 20 0v12a10 10 0 0 1-10 10zM184 138.896a10 10 0 0 1-10-10v-12a10 10 0 0 1 20 0v12a10 10 0 0 1-10 10z"/>
  <path fill="#059669" opacity="0.6" d="M72 141c-6.9 0-12.5-5.6-12.5-12.5v-12C59.5 109.6 65.1 104 72 104s12.5 5.6 12.5 12.5v12C84.5 135.4 78.9 141 72 141zm0-33a8.5 8.5 0 0 0-8.5 8.5v12a8.5 8.5 0 0 0 17 0v-12A8.5 8.5 0 0 0 72 108zM184 141c-6.9 0-12.5-5.6-12.5-12.5v-12c0-6.9 5.6-12.5 12.5-12.5s12.5 5.6 12.5 12.5v12c0 6.9-5.6 12.5-12.5 12.5zm0-33a8.5 8.5 0 0 0-8.5 8.5v12a8.5 8.5 0 0 0 17 0v-12A8.5 8.5 0 0 0 184 108z"/>
</svg>`

export function setupRoutes(deps: SetupRouteDeps): Hono {
  const app = new Hono()

  app.get('/setup', (c) => {
    if (deps.isConfigured()) {
      return c.redirect('/health')
    }

    return c.html(html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Viper — Setup</title>
  <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
  <style>
    @font-face { font-family: 'Costaline'; src: url('/public/fonts/costaline_variable-vf.ttf') format('truetype'); font-weight: 100 900; font-display: swap; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; min-height: 100vh; }
    .top-bar { position: fixed; top: 0; left: 0; right: 0; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; z-index: 10; }
    .top-bar span { font-size: 0.85rem; font-weight: 600; color: #fff; }
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 4rem 1rem 2rem; }
    .setup { max-width: 480px; width: 100%; }
    h1 { font-family: 'Costaline', sans-serif; font-size: 1.75rem; color: #fff; font-weight: 600; margin-bottom: 0.25rem; }
    .sub { color: #666; font-size: 0.8rem; margin-bottom: 2rem; }
    .step { margin-bottom: 2rem; }
    .step-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: #555; margin-bottom: 0.5rem; }
    .cards { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .card { flex: 1; padding: 0.75rem; background: #111; border: 1px solid #222; border-radius: 6px; cursor: pointer; text-align: center; transition: border-color 0.15s; }
    .card:hover { border-color: #444; }
    .card.selected { border-color: #10b981; background: #0a1a14; }
    .card-name { font-size: 0.85rem; font-weight: 500; color: #fff; }
    .card-desc { font-size: 0.7rem; color: #666; margin-top: 0.15rem; }
    label { display: block; font-size: 0.8rem; color: #aaa; margin-bottom: 0.25rem; }
    .field { margin-bottom: 0.75rem; }
    .hint { font-size: 0.7rem; color: #555; margin-top: 0.25rem; }
    input, select, textarea { width: 100%; padding: 0.5rem 0.75rem; background: #111; border: 1px solid #282828; border-radius: 4px; color: #fff; font-size: 0.85rem; font-family: inherit; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #10b981; }
    textarea { resize: vertical; font-family: monospace; font-size: 0.75rem; line-height: 1.4; }
    select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
    .advanced-toggle { font-size: 0.7rem; color: #444; cursor: pointer; margin-bottom: 0.5rem; }
    .advanced-toggle:hover { color: #888; }
    .advanced-fields { display: none; }
    .advanced-fields.visible { display: block; }
    .divider { border: none; border-top: 1px solid #1a1a1a; margin: 0.5rem 0 2rem; }
    button { width: 100%; padding: 0.75rem; background: #10b981; color: #000; border: none; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.15s; }
    button:hover { background: #059669; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: #f44; font-size: 0.8rem; margin-top: 0.75rem; display: none; }
    .success { text-align: center; padding: 3rem 1rem; }
    .success h2 { font-family: 'Costaline', sans-serif; color: #10b981; font-size: 1.5rem; }
    .success p { margin-top: 0.5rem; }
    code { background: #1a1a1a; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.8rem; color: #10b981; }
  </style>
</head>
<body>
  <div class="top-bar">
    ${raw(LOGO_SVG)}
    <span>Viper</span>
  </div>
  <div class="page">
    <div class="setup" id="form-view">
      <h1>Setup</h1>
      <p class="sub">Connect your code host and AI provider so Viper can review pull requests.</p>

      <form id="setup-form">
        <div class="step">
          <div class="step-label">Step 1 — Code host</div>
          <div class="cards" id="vcs-cards"></div>
          <input type="hidden" name="vcs_provider_type" id="vcs_provider_type" required>
          <div id="vcs-fields"></div>
        </div>

        <hr class="divider">

        <div class="step">
          <div class="step-label">Step 2 — AI provider</div>
          <div class="cards" id="ai-cards"></div>
          <input type="hidden" name="ai_provider_type" id="ai_provider_type" required>
          <div id="ai-fields"></div>
        </div>

        <hr class="divider">

        <div class="step">
          <div class="step-label">Step 3 — Webhook security</div>
          <div class="field">
            <label for="webhook_secret">Webhook Secret</label>
            <input id="webhook_secret" name="webhook_secret" type="password" required>
            <p class="hint">A shared secret between Viper and your code host. Paste the same value into your repository's webhook settings.</p>
          </div>
        </div>

        <div class="error" id="error"></div>
        <button type="submit">Activate Viper</button>
      </form>
    </div>
    <div class="setup success" id="success-view" style="display:none">
      <h2>Ready</h2>
      <p>Viper is listening for webhooks.</p>
      <p style="margin-top:1rem;color:#666;font-size:0.8rem;">Point your repository webhook to <code>/webhook</code></p>
    </div>
  </div>
  <script>
    let vcsProviders = [], aiProviders = []

    async function init() {
      const [vcsRes, aiRes] = await Promise.all([
        fetch('/api/vcs/types').then(r => r.json()),
        fetch('/api/ai/types').then(r => r.json()),
      ])
      vcsProviders = vcsRes.providers
      aiProviders = aiRes.providers
      renderCards('vcs-cards', vcsProviders, selectVcs)
      renderCards('ai-cards', aiProviders, selectAi)
      if (vcsProviders.length === 1) selectVcs(vcsProviders[0].type)
      if (aiProviders.length === 1) selectAi(aiProviders[0].type)
    }

    function renderCards(containerId, providers, onClick) {
      const el = document.getElementById(containerId)
      el.innerHTML = providers.map(p =>
        '<div class="card" data-type="' + p.type + '">' +
          '<div class="card-name">' + p.name + '</div>' +
        '</div>'
      ).join('')
      el.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => onClick(card.dataset.type))
      })
    }

    function selectVcs(type) {
      document.getElementById('vcs_provider_type').value = type
      document.querySelectorAll('#vcs-cards .card').forEach(c => c.classList.toggle('selected', c.dataset.type === type))
      const provider = vcsProviders.find(p => p.type === type)
      renderFields('vcs-fields', provider.configSchema, 'vcs_')
    }

    function selectAi(type) {
      document.getElementById('ai_provider_type').value = type
      document.querySelectorAll('#ai-cards .card').forEach(c => c.classList.toggle('selected', c.dataset.type === type))
      const provider = aiProviders.find(p => p.type === type)
      const fields = [...provider.configSchema]
      if (provider.models && provider.models.length > 0) {
        const defaultModel = provider.models.find(m => m.default) || provider.models[0]
        const opts = provider.models.map(m => ({ value: m.id, label: m.label, selected: m.default }))
        fields.push({ name: 'model', label: 'Model', type: 'select', required: false, options: opts, defaultValue: defaultModel.id })
      }
      renderFields('ai-fields', fields, 'ai_')
    }

    function renderFields(containerId, schema, prefix) {
      const el = document.getElementById(containerId)
      const normal = schema.filter(f => !f.advanced)
      const advanced = schema.filter(f => f.advanced)
      let h = normal.map(f => fieldHtml(f, prefix)).join('')
      if (advanced.length > 0) {
        h += '<div class="advanced-toggle" data-toggle="adv">Advanced settings</div>'
        h += '<div class="advanced-fields">' + advanced.map(f => fieldHtml(f, prefix)).join('') + '</div>'
      }
      el.innerHTML = h
      el.querySelectorAll('[data-toggle="adv"]').forEach(t => {
        t.addEventListener('click', () => t.nextElementSibling.classList.toggle('visible'))
      })
    }

    function fieldHtml(f, prefix) {
      const name = prefix + f.name
      const val = f.defaultValue || ''
      const req = f.required ? 'required' : ''
      let input
      if (f.type === 'select' || f.options) {
        const opts = (f.options || []).map(o =>
          '<option value="' + (o.value || o) + '"' + (o.selected ? ' selected' : '') + '>' + (o.label || o) + '</option>'
        ).join('')
        input = '<select id="' + name + '" name="' + name + '" ' + req + '>' + opts + '</select>'
      } else if (f.type === 'textarea') {
        input = '<textarea id="' + name + '" name="' + name + '" rows="4" ' + (f.placeholder ? 'placeholder="' + f.placeholder + '"' : '') + ' ' + req + '>' + val + '</textarea>'
      } else {
        input = '<input id="' + name + '" name="' + name + '" type="' + f.type + '" value="' + val + '" ' + (f.placeholder ? 'placeholder="' + f.placeholder + '"' : '') + ' ' + req + '>'
      }
      const hint = f.helpText ? '<p class="hint">' + f.helpText + '</p>' : ''
      return '<div class="field"><label for="' + name + '">' + f.label + '</label>' + input + hint + '</div>'
    }

    document.getElementById('setup-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = e.target.querySelector('button')
      const err = document.getElementById('error')
      btn.disabled = true
      btn.textContent = 'Activating...'
      err.style.display = 'none'
      const data = Object.fromEntries(new FormData(e.target))
      try {
        let res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        if (!res.ok) throw new Error(await res.text())
        res = await fetch('/api/reload', { method: 'POST' })
        const result = await res.json()
        if (!result.configured) throw new Error('Settings saved but providers failed to initialise. Check your credentials.')
        document.getElementById('form-view').style.display = 'none'
        document.getElementById('success-view').style.display = 'block'
      } catch (ex) {
        err.textContent = ex.message
        err.style.display = 'block'
        btn.disabled = false
        btn.textContent = 'Activate Viper'
      }
    })

    init()
  </script>
</body>
</html>`)
  })

  return app
}
