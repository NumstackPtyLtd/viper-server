import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReviewMergeRequest } from './ReviewMergeRequest.js'
import type { VcsProvider, DiffFile, DiffVersion } from 'viper-vcs-providers'
import type { AiReviewer, AiReviewResult } from 'viper-ai-providers'
import type { ConfigLoader, ViperReviewConfig } from '../../domain/ports/ConfigLoader.js'
import type { EventBus } from '../../domain/ports/EventBus.js'

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

function mockEventBus(): EventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  }
}

const defaultConfig: ViperReviewConfig = {
  style: { tone: 'friendly', focus: [], language: 'English' },
  rules: [],
  ignore: [],
  maxComments: 20,
  autoResolve: true,
}

const sampleDiff: DiffFile[] = [{
  oldPath: 'src/app.ts',
  newPath: 'src/app.ts',
  diff: '@@ -1 +1 @@\n-old\n+new',
  isNew: false,
  isDeleted: false,
  isRenamed: false,
}]

const sampleVersion: DiffVersion = {
  baseSha: 'base',
  startSha: 'start',
  headSha: 'head',
}

const sampleAiResult: AiReviewResult = {
  summary: 'Good MR overall.',
  findings: [
    { file: 'src/app.ts', line: 1, severity: 'warning', comment: 'Consider error handling' },
  ],
}

describe('ReviewMergeRequest', () => {
  let vcs: ReturnType<typeof mockVcs>
  let ai: ReturnType<typeof mockAi>
  let configLoader: ReturnType<typeof mockConfigLoader>
  let eventBus: ReturnType<typeof mockEventBus>
  let useCase: ReviewMergeRequest

  const dto = {
    projectId: 1,
    mrIid: 42,
    title: 'Add feature',
    description: 'New feature description',
    sourceBranch: 'feature/foo',
    targetBranch: 'main',
  }

  beforeEach(() => {
    vcs = mockVcs()
    ai = mockAi()
    configLoader = mockConfigLoader()
    eventBus = mockEventBus()
    useCase = new ReviewMergeRequest(vcs, ai, configLoader, eventBus)
    ;(configLoader.load as ReturnType<typeof vi.fn>).mockResolvedValue(defaultConfig)
    ;(vcs.getMergeRequestDiff as ReturnType<typeof vi.fn>).mockResolvedValue(sampleDiff)
    ;(vcs.getMergeRequestVersion as ReturnType<typeof vi.fn>).mockResolvedValue(sampleVersion)
    ;(ai.review as ReturnType<typeof vi.fn>).mockResolvedValue(sampleAiResult)
  })

  it('performs full review workflow', async () => {
    const review = await useCase.execute(dto)

    expect(configLoader.load).toHaveBeenCalledWith(1, 'feature/foo')
    expect(vcs.getMergeRequestDiff).toHaveBeenCalledWith(1, 42)
    expect(ai.review).toHaveBeenCalled()
    expect(vcs.createComment).toHaveBeenCalled()
    expect(vcs.createInlineComment).toHaveBeenCalled()
    expect(eventBus.publishAll).toHaveBeenCalled()
    expect(review.getSummary()).toBe('Good MR overall.')
    expect(review.getFindings()).toHaveLength(1)
  })

  it('returns early when all files are ignored', async () => {
    ;(configLoader.load as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...defaultConfig,
      ignore: ['**/*.ts'],
    })

    const review = await useCase.execute(dto)
    expect(review.getSummary()).toBe('No reviewable changes.')
    expect(ai.review).not.toHaveBeenCalled()
  })

  it('falls back to general comment on inline failure', async () => {
    ;(vcs.createInlineComment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Position error'))

    await useCase.execute(dto)
    // Should have called createComment twice: once for summary, once for fallback
    expect(vcs.createComment).toHaveBeenCalledTimes(2)
  })

  it('respects maxComments limit', async () => {
    const manyFindings = Array.from({ length: 30 }, (_, i) => ({
      file: `src/file${i}.ts`,
      line: i + 1,
      severity: 'warning' as const,
      comment: `Finding ${i}`,
    }))
    ;(ai.review as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: 'Many issues',
      findings: manyFindings,
    })
    ;(configLoader.load as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...defaultConfig,
      maxComments: 5,
    })

    const review = await useCase.execute(dto)
    expect(review.getFindings()).toHaveLength(5)
  })

  it('skips inline comments when no version available', async () => {
    ;(vcs.getMergeRequestVersion as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await useCase.execute(dto)
    expect(vcs.createInlineComment).not.toHaveBeenCalled()
    expect(vcs.createComment).toHaveBeenCalledTimes(1)
  })
})
