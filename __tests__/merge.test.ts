import { mergeLWW } from '../src/services/merge'

const A = { id: 'a', updatedAt: '2026-06-01T00:00:00.000Z', v: 1 }
const A2 = { id: 'a', updatedAt: '2026-06-05T00:00:00.000Z', v: 2 }
const B = { id: 'b', updatedAt: '2026-06-02T00:00:00.000Z', v: 1 }

describe('mergeLWW', () => {
  it('keeps the record with the later updatedAt per id', () => {
    expect(mergeLWW([A], [A2])).toEqual([A2])
    expect(mergeLWW([A2], [A])).toEqual([A2])
  })
  it('unions records that exist on only one side', () => {
    const merged = mergeLWW([A], [B])
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })
  it('a remote tombstone (deletedAt) with a later updatedAt wins', () => {
    const tomb = { id: 'a', updatedAt: '2026-06-06T00:00:00.000Z', deletedAt: '2026-06-06T00:00:00.000Z' }
    expect(mergeLWW<any>([A2], [tomb])).toEqual([tomb])
  })
  it('treats a missing updatedAt as oldest', () => {
    const noMeta = { id: 'a', v: 9 }
    expect(mergeLWW([noMeta as any], [A])).toEqual([A])
  })
})
