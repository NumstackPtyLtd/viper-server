import { describe, it, expect } from 'vitest'
import { GitLabPlugin } from './GitLabPlugin.js'

describe('GitLabPlugin', () => {
  const plugin = new GitLabPlugin()

  describe('metadata', () => {
    it('has correct type and name', () => {
      expect(plugin.type).toBe('gitlab')
      expect(plugin.name).toBe('GitLab')
      expect(plugin.webhookAuthHeader).toBe('x-gitlab-token')
    })
  })

  describe('createProvider', () => {
    it('creates a provider with token and url', () => {
      const provider = plugin.createProvider({ token: 'test', url: 'https://gitlab.example.com' })
      expect(provider).toBeDefined()
      expect(provider.getMergeRequestDiff).toBeTypeOf('function')
    })

    it('throws when url is missing', () => {
      expect(() => plugin.createProvider({ token: 'test' })).toThrow('requires a VCS_URL')
    })
  })

  describe('validateWebhookAuth', () => {
    it('validates correct header', () => {
      expect(plugin.validateWebhookAuth({ 'x-gitlab-token': 'secret' }, 'secret')).toBe(true)
    })

    it('rejects wrong value', () => {
      expect(plugin.validateWebhookAuth({ 'x-gitlab-token': 'wrong' }, 'secret')).toBe(false)
    })

    it('rejects missing header', () => {
      expect(plugin.validateWebhookAuth({}, 'secret')).toBe(false)
    })
  })

  describe('parseWebhookPayload', () => {
    it('parses merge_request event', () => {
      const payload = {
        object_kind: 'merge_request',
        project: { id: 42 },
        object_attributes: {
          iid: 7,
          title: 'Add feature',
          description: 'Desc',
          source_branch: 'feature/foo',
          target_branch: 'main',
          action: 'open',
          author_id: 1,
        },
      }

      const event = plugin.parseWebhookPayload(payload)
      expect(event).not.toBeNull()
      expect(event!.kind).toBe('merge_request')
      expect(event!.mergeRequest!.projectId).toBe(42)
      expect(event!.mergeRequest!.iid).toBe(7)
      expect(event!.mergeRequest!.title).toBe('Add feature')
      expect(event!.mergeRequest!.action).toBe('open')
    })

    it('parses note event on MR', () => {
      const payload = {
        object_kind: 'note',
        project: { id: 42 },
        merge_request: { iid: 7, source_branch: 'feature/foo' },
        object_attributes: {
          note: 'Fixed it',
          noteable_type: 'MergeRequest',
          author_id: 1,
          discussion_id: 'disc-1',
        },
      }

      const event = plugin.parseWebhookPayload(payload)
      expect(event).not.toBeNull()
      expect(event!.kind).toBe('comment')
      expect(event!.comment!.mrIid).toBe(7)
      expect(event!.comment!.body).toBe('Fixed it')
    })

    it('returns null for non-MR note', () => {
      const payload = {
        object_kind: 'note',
        project: { id: 42 },
        object_attributes: {
          note: 'test',
          noteable_type: 'Issue',
          author_id: 1,
          discussion_id: 'disc-1',
        },
      }

      expect(plugin.parseWebhookPayload(payload)).toBeNull()
    })

    it('returns null for unknown event', () => {
      expect(plugin.parseWebhookPayload({ object_kind: 'pipeline' })).toBeNull()
    })

    it('returns null for non-object input', () => {
      expect(plugin.parseWebhookPayload(null)).toBeNull()
      expect(plugin.parseWebhookPayload('string')).toBeNull()
    })
  })
})
