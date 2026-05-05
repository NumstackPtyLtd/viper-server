import type { VcsPlugin, VcsPluginConfig, WebhookEvent, ConfigField } from '../../../application/ports/VcsPlugin.js'
import type { VcsProvider } from '../../../domain/ports/VcsProvider.js'
import { GitLabVcsProvider } from './GitLabVcsProvider.js'

interface GitLabMrPayload {
  object_kind: 'merge_request'
  project: { id: number }
  object_attributes: {
    iid: number
    title: string
    description: string | null
    source_branch: string
    target_branch: string
    action?: string
    author_id: number
  }
}

interface GitLabNotePayload {
  object_kind: 'note'
  project: { id: number }
  merge_request?: { iid: number; source_branch: string }
  object_attributes: {
    note: string
    noteable_type: string
    author_id: number
    discussion_id: string
  }
}

export class GitLabPlugin implements VcsPlugin {
  readonly type = 'gitlab'
  readonly name = 'GitLab'
  readonly description = 'GitLab merge request reviews via webhooks'
  readonly webhookAuthHeader = 'x-gitlab-token'

  readonly configSchema: ConfigField[] = [
    { name: 'token', label: 'Private Token', type: 'password', required: true, placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx' },
    { name: 'url', label: 'GitLab URL', type: 'url', required: false, placeholder: 'https://gitlab.com' },
  ]

  createProvider(config: VcsPluginConfig): VcsProvider {
    if (!config.url) {
      throw new Error('GitLab plugin requires a VCS_URL (e.g. https://gitlab.com)')
    }
    return new GitLabVcsProvider(config.token, config.url)
  }

  parseWebhookPayload(body: unknown): WebhookEvent | null {
    if (!body || typeof body !== 'object') return null
    const payload = body as Record<string, unknown>
    const objectKind = payload.object_kind as string | undefined

    if (objectKind === 'merge_request') {
      return this.parseMergeRequest(body as GitLabMrPayload)
    }

    if (objectKind === 'note') {
      return this.parseNote(body as GitLabNotePayload)
    }

    return null
  }

  validateWebhookAuth(headers: Record<string, string | undefined>, secret: string): boolean {
    return headers[this.webhookAuthHeader] === secret
  }

  private parseMergeRequest(payload: GitLabMrPayload): WebhookEvent {
    const mr = payload.object_attributes
    return {
      kind: 'merge_request',
      mergeRequest: {
        projectId: payload.project.id,
        iid: mr.iid,
        title: mr.title,
        description: mr.description,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        action: mr.action ?? '',
        authorId: mr.author_id,
      },
    }
  }

  private parseNote(payload: GitLabNotePayload): WebhookEvent | null {
    const note = payload.object_attributes
    if (note.noteable_type !== 'MergeRequest' || !payload.merge_request) return null

    return {
      kind: 'comment',
      comment: {
        projectId: payload.project.id,
        mrIid: payload.merge_request.iid,
        discussionId: note.discussion_id,
        body: note.note,
        authorId: note.author_id,
        sourceBranch: payload.merge_request.source_branch,
      },
    }
  }
}
