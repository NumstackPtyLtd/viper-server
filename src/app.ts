/**
 * App factory — creates the Hono app with all routes mounted.
 *
 * First run: visit / to get the setup wizard.
 * After setup: webhooks + all API routes active.
 */
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Container } from './container.js'
import { healthRoutes } from './presentation/api/routes/health.js'
import { webhookRoutes } from './presentation/api/routes/webhook.js'
import { settingsRoutes } from './presentation/api/routes/settings.js'
import { setupRoutes } from './presentation/api/routes/setup.js'
import { reviewRoutes } from './presentation/api/routes/reviews.js'
import { tokenRoutes } from './presentation/api/routes/tokens.js'
import { connectionRoutes } from './presentation/api/routes/connections.js'
import { projectRoutes } from './presentation/api/routes/projects.js'
import { wikiRoutes } from './presentation/api/routes/wiki.js'
import { reviewConfigRoutes } from './presentation/api/routes/reviewConfigs.js'
import { policyRoutes } from './presentation/api/routes/policies.js'
import { randomUUID } from 'crypto'
import { ReviewMergeRequest } from './application/use-cases/ReviewMergeRequest.js'
import { RespondToDiscussion } from './application/use-cases/RespondToDiscussion.js'
import { YamlConfigLoader } from './infrastructure/config/YamlConfigLoader.js'
import { LogEventBus } from './infrastructure/events/LogEventBus.js'
import { webhookAuth } from './presentation/api/middleware/webhookAuth.js'
import { registry as aiRegistry } from 'viper-ai-providers'
import { logger } from './shared/logger.js'

const DEFAULT_ORG_ID = 'default'

export interface AppOptions {
  /** Override org resolution. Cloud passes JWT-based resolver. */
  getOrgId?: () => string
}

export function createApp(container: Container, options?: AppOptions): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('Unhandled error:', err.message)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Static assets
  app.use('/public/*', serveStatic({ root: './' }))

  // Root
  app.get('/', (c) => c.redirect(container.configured ? '/health' : '/setup'))

  // Always available
  app.route('/', healthRoutes())
  app.route('/', setupRoutes({ isConfigured: () => container.configured }))

  // Provider discovery
  app.get('/api/vcs/types', (c) => c.json({ providers: container.vcsRegistry.schemas() }))
  app.get('/api/ai/types', (c) => c.json({ providers: container.aiRegistry.schemas() }))

  // Status + reload
  app.get('/api/status', (c) => c.json({ configured: container.configured, vcs: container.vcsRegistry.schemas(), ai: container.aiRegistry.schemas() }))
  app.post('/api/reload', (c) => { const { configured } = container.reload(); return c.json({ ok: true, configured }) })

  // --- Data routes (org-scoped) ---
  // In OSS single-tenant mode, getOrgId returns DEFAULT_ORG_ID.
  // Cloud overlay replaces this via auth middleware (user's org from JWT).
  const getOrgId = options?.getOrgId ?? (() => DEFAULT_ORG_ID)

  app.route('/', reviewRoutes({ reviews: container.reviews, getOrgId }))
  app.route('/', tokenRoutes({ tokens: container.tokens, aiRegistry: container.aiRegistry, getOrgId }))
  app.route('/', connectionRoutes({ connections: container.connections, getOrgId }))
  app.route('/', projectRoutes({ projects: container.projects, getOrgId }))
  app.route('/', wikiRoutes({ wiki: container.wiki, getOrgId }))
  app.route('/', reviewConfigRoutes({ reviewConfigs: container.reviewConfigs, getOrgId }))
  app.route('/', policyRoutes({ policies: container.policies, wiki: container.wiki, policyResolver: container.policyResolver, getOrgId }))

  // Settings routes last (catch-all /api/settings/:key)
  app.route('/', settingsRoutes({ settings: container.settings }))

  // Webhook — parses, authenticates, reviews, and persists
  app.post('/webhook', async (c) => {
    if (!container.configured) {
      return c.json({ error: 'Not configured. Visit /setup to get started.' }, 503)
    }
    const webhookSecret = container.settings.get('webhook_secret')
    if (!webhookSecret) return c.json({ error: 'webhook_secret not set.' }, 503)

    // Auth
    const headers: Record<string, string | undefined> = {}
    c.req.raw.headers.forEach((value, key) => { headers[key.toLowerCase()] = value })
    const rawBody = await c.req.raw.clone().text()
    if (!container.vcsPlugin.validateWebhookAuth(headers, webhookSecret, rawBody)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Parse
    const body = JSON.parse(rawBody)
    const event = container.vcsPlugin.parseWebhookPayload(body)
    if (!event) return c.json({ ok: true })

    logger.info({ kind: event.kind, provider: container.vcsPlugin.type }, 'Webhook received')

    // Resolve project + org
    const repoFullName: string | undefined = body.repository?.full_name
    const project = repoFullName ? container.projects.findByFullPath(repoFullName) : null
    const orgId = project?.org_id ?? getOrgId()

    // Resolve AI reviewer: org token > server key
    let useCaseReview: ReviewMergeRequest
    let useCaseDiscussion: RespondToDiscussion
    const orgToken = project ? container.tokens.getDefault(project.org_id) : null
    if (orgToken) {
      try {
        const aiPlugin = aiRegistry.get(orgToken.provider)
        const aiReviewer = aiPlugin.createReviewer({ apiKey: orgToken.api_key, model: orgToken.model ?? undefined })
        const configLoader = new YamlConfigLoader(container.vcsProvider)
        const eventBus = new LogEventBus()
        useCaseReview = new ReviewMergeRequest(container.vcsProvider, aiReviewer, configLoader, eventBus, container.policyResolver, container.wiki)
        useCaseDiscussion = new RespondToDiscussion(container.vcsProvider, aiReviewer, configLoader)
        logger.info({ org: orgId, provider: orgToken.provider }, 'Using org AI token')
      } catch {
        useCaseReview = container.reviewMergeRequest
        useCaseDiscussion = container.respondToDiscussion
      }
    } else {
      useCaseReview = container.reviewMergeRequest
      useCaseDiscussion = container.respondToDiscussion
    }

    const botUserId = container.settings.get('bot_user_id')
    const botId = botUserId ? Number(botUserId) : null

    // Handle merge_request — review + persist
    if (event.kind === 'merge_request' && event.mergeRequest) {
      const mr = event.mergeRequest
      const reviewableActions = ['open', 'reopen', 'update']
      if (mr.action && reviewableActions.includes(mr.action)) {
        // Respond immediately, process async
        const doReview = async () => {
          try {
            const review = await useCaseReview.execute({
              projectId: mr.projectId, mrIid: mr.iid, title: mr.title,
              description: mr.description, sourceBranch: mr.sourceBranch, targetBranch: mr.targetBranch,
              orgId, internalProjectId: project?.id ?? undefined,
            })

            // Persist to DB
            const findings = review.getFindings()
            container.reviews.create({
              id: review.getId().toString(), org_id: orgId, project_id: project?.id ?? null,
              mr_iid: mr.iid, title: mr.title, description: mr.description,
              source_branch: mr.sourceBranch, target_branch: mr.targetBranch,
              author: String(mr.authorId), provider: container.vcsPlugin.type,
              verdict: review.getCriticalCount() > 0 ? 'request_changes' : 'comment',
              summary: review.getSummary(), findings_count: findings.length,
              critical_count: findings.filter(f => f.getSeverity().isCritical()).length,
              warning_count: findings.filter(f => f.getSeverity().toString() === 'warning').length,
              suggestion_count: findings.filter(f => f.getSeverity().toString() === 'suggestion').length,
              praise_count: findings.filter(f => f.getSeverity().toString() === 'praise').length,
              url: repoFullName ? `https://github.com/${repoFullName}/pull/${mr.iid}` : null,
              created_at: new Date().toISOString(),
            })
            container.reviews.addFindings(findings.map(f => ({
              id: randomUUID(), review_id: review.getId().toString(),
              file: f.getFile().toString(), line: f.getLine().toNumber(),
              severity: f.getSeverity().toString(), comment: f.getComment(),
            })))
            logger.info({ reviewId: review.getId().toString(), findings: findings.length }, 'Review persisted')
          } catch (err) {
            logger.error({ err }, 'Review failed')
          }
        }
        doReview()
      }
    }

    // Handle comment — reply
    if (event.kind === 'comment' && event.comment) {
      const comment = event.comment
      if (botId === null || comment.authorId !== botId) {
        const doReply = async () => {
          try {
            await useCaseDiscussion.execute({
              projectId: comment.projectId, mrIid: comment.mrIid,
              discussionId: comment.discussionId, noteBody: comment.body,
              noteAuthorId: comment.authorId, sourceBranch: comment.sourceBranch, botUserId: botId,
            })
          } catch (err) {
            logger.error({ err }, 'Discussion reply failed')
          }
        }
        doReply()
      }
    }

    return c.json({ ok: true })
  })

  return app
}
