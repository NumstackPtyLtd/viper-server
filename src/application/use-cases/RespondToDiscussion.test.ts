import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RespondToDiscussion } from './RespondToDiscussion.js'
import type { VcsProvider, Discussion } from '@supaproxy/viper-vcs-providers'
import type { AiReviewer } from '@supaproxy/viper-ai-providers'
import type { ConfigLoader, ViperReviewConfig } from '../../domain/ports/ConfigLoader.js'

function mockVcs(): VcsProvider {
  return {
    getMergeRequestDiff: vi.fn(),
    getMergeRequestVersion: vi.fn(),
    getDiscussions: vi.fn(),
    createInlineComment: vi.fn(),
    createComment: vi.fn(),
    replyToDiscussion: vi.fn(),
    resolveDiscussion: vi.fn(),
    getFileContent: vi.fn(),
  }
}

function mockAi(): AiReviewer {
  return {
    review: vi.fn(),
    respondToDiscussion: vi.fn(),
  }
}

function mockConfigLoader(): ConfigLoader {
  return { load: vi.fn() }
}

const defaultConfig: ViperReviewConfig = {
  style: { tone: 'friendly', focus: [], language: 'English' },
  rules: [],
  ignore: [],
  maxComments: 20,
  autoResolve: true,
}

const viperDiscussion: Discussion = {
  id: 'disc-1',
  notes: [
    {
      id: 100,
      body: 'Review by [Viper]: Missing null check',
      authorId: 999,
      authorUsername: 'viper-bot',
      resolved: false,
      filePath: 'src/app.ts',
      line: 10,
    },
    {
      id: 101,
      body: 'I fixed it',
      authorId: 1,
      authorUsername: 'dev',
      resolved: false,
    },
  ],
}

describe('RespondToDiscussion', () => {
  let vcs: ReturnType<typeof mockVcs>
  let ai: ReturnType<typeof mockAi>
  let configLoader: ReturnType<typeof mockConfigLoader>
  let useCase: RespondToDiscussion

  const dto = {
    projectId: 1,
    mrIid: 42,
    discussionId: 'disc-1',
    noteBody: 'I fixed it',
    noteAuthorId: 1,
    sourceBranch: 'feature/foo',
    botUserId: 999,
  }

  beforeEach(() => {
    vcs = mockVcs()
    ai = mockAi()
    configLoader = mockConfigLoader()
    useCase = new RespondToDiscussion(vcs, ai, configLoader)
    ;(vcs.getDiscussions as ReturnType<typeof vi.fn>).mockResolvedValue([viperDiscussion])
    ;(vcs.getMergeRequestDiff as ReturnType<typeof vi.fn>).mockResolvedValue([{
      oldPath: 'src/app.ts',
      newPath: 'src/app.ts',
      diff: '@@ -1 +1 @@\n-old\n+new',
      isNew: false,
      isDeleted: false,
      isRenamed: false,
    }])
    ;(ai.respondToDiscussion as ReturnType<typeof vi.fn>).mockResolvedValue('Looks good, thanks for fixing!')
    ;(configLoader.load as ReturnType<typeof vi.fn>).mockResolvedValue(defaultConfig)
  })

  it('responds to Viper thread', async () => {
    await useCase.execute(dto)

    expect(ai.respondToDiscussion).toHaveBeenCalled()
    expect(vcs.replyToDiscussion).toHaveBeenCalledWith(1, 42, 'disc-1', 'Looks good, thanks for fixing!')
  })

  it('auto-resolves when response looks resolved', async () => {
    await useCase.execute(dto)

    expect(vcs.resolveDiscussion).toHaveBeenCalledWith(1, 42, 'disc-1', true)
  })

  it('does not auto-resolve when disabled', async () => {
    ;(configLoader.load as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...defaultConfig,
      autoResolve: false,
    })

    await useCase.execute(dto)
    expect(vcs.resolveDiscussion).not.toHaveBeenCalled()
  })

  it('does not auto-resolve when response does not look resolved', async () => {
    ;(ai.respondToDiscussion as ReturnType<typeof vi.fn>).mockResolvedValue('Please reconsider this approach.')

    await useCase.execute(dto)
    expect(vcs.resolveDiscussion).not.toHaveBeenCalled()
  })

  it('skips non-Viper threads', async () => {
    ;(vcs.getDiscussions as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: 'disc-1',
      notes: [{
        id: 100,
        body: 'Some human comment',
        authorId: 2,
        authorUsername: 'human',
        resolved: false,
      }],
    }])

    await useCase.execute({ ...dto, botUserId: 999 })
    expect(ai.respondToDiscussion).not.toHaveBeenCalled()
  })

  it('skips when discussion not found', async () => {
    ;(vcs.getDiscussions as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await useCase.execute(dto)
    expect(ai.respondToDiscussion).not.toHaveBeenCalled()
  })

  it('identifies Viper thread by signature', async () => {
    ;(vcs.getDiscussions as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: 'disc-1',
      notes: [{
        id: 100,
        body: 'Review by [Viper]: Issue found',
        authorId: 888, // Different from botUserId
        authorUsername: 'other',
        resolved: false,
        filePath: 'src/app.ts',
      }],
    }])

    await useCase.execute({ ...dto, botUserId: null })
    expect(ai.respondToDiscussion).toHaveBeenCalled()
  })
})
