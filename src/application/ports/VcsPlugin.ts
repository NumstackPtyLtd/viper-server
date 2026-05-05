import type { VcsProvider } from '../../domain/ports/VcsProvider.js'

/**
 * Normalized webhook event — VCS-agnostic.
 * Each VcsPlugin maps its provider-specific payload to this shape.
 */
export interface WebhookEvent {
  kind: 'merge_request' | 'comment'
  mergeRequest?: {
    projectId: number
    iid: number
    title: string
    description: string | null
    sourceBranch: string
    targetBranch: string
    action: string
    authorId: number
  }
  comment?: {
    projectId: number
    mrIid: number
    discussionId: string
    body: string
    authorId: number
    sourceBranch: string
  }
}

export interface VcsPluginConfig {
  token: string
  url?: string
}

export interface ConfigField {
  name: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
}

/**
 * Port: VCS Plugin
 *
 * Combines the VcsProvider port with metadata, webhook parsing,
 * and factory methods. Each VCS adapter (GitLab, GitHub, Bitbucket)
 * implements this interface and self-registers in the VcsRegistry.
 */
export interface VcsPlugin {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly configSchema: ConfigField[]

  /** Create a VcsProvider instance from config */
  createProvider(config: VcsPluginConfig): VcsProvider

  /** Parse a raw webhook body into a normalized event, or null if unrecognised */
  parseWebhookPayload(body: unknown): WebhookEvent | null

  /** Validate the webhook auth header. Returns true if valid. */
  validateWebhookAuth(headers: Record<string, string | undefined>, secret: string): boolean

  /** The header name this provider uses for webhook auth */
  readonly webhookAuthHeader: string
}
