import { describe, it, expect } from 'vitest'
import { MergeRequestId } from './MergeRequestId.js'

describe('MergeRequestId', () => {
  it('creates with valid values', () => {
    const id = MergeRequestId.create(42, 7)
    expect(id.getProjectId()).toBe(42)
    expect(id.getIid()).toBe(7)
    expect(id.toString()).toBe('42!7')
  })

  it('throws on invalid projectId', () => {
    expect(() => MergeRequestId.create(0, 1)).toThrow('projectId must be a positive integer')
    expect(() => MergeRequestId.create(-1, 1)).toThrow('projectId must be a positive integer')
    expect(() => MergeRequestId.create(1.5, 1)).toThrow('projectId must be a positive integer')
  })

  it('throws on invalid iid', () => {
    expect(() => MergeRequestId.create(1, 0)).toThrow('MR iid must be a positive integer')
    expect(() => MergeRequestId.create(1, -1)).toThrow('MR iid must be a positive integer')
  })

  it('compares equality', () => {
    const id1 = MergeRequestId.create(1, 2)
    const id2 = MergeRequestId.create(1, 2)
    const id3 = MergeRequestId.create(1, 3)
    expect(id1.equals(id2)).toBe(true)
    expect(id1.equals(id3)).toBe(false)
  })
})
