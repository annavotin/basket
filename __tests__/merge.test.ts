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
  it('resolves an exact-equal-updatedAt tie deterministically, independent of merge order', () => {
    const tieLo = { id: 'a', updatedAt: '2026-06-01T00:00:00.000Z', v: 1 }
    const tieHi = { id: 'a', updatedAt: '2026-06-01T00:00:00.000Z', v: 2 }
    const winner = mergeLWW([tieLo], [tieHi])[0]
    // Whichever record wins, both merge orders must converge on the SAME winner.
    expect(mergeLWW([tieHi], [tieLo])).toEqual([winner])
    expect(mergeLWW([tieLo], [tieHi])).toEqual([winner])
  })
  it('resolves a both-missing-updatedAt tie deterministically, independent of merge order', () => {
    const tieLo = { id: 'a', v: 1 }
    const tieHi = { id: 'a', v: 2 }
    const winner = mergeLWW([tieLo as any], [tieHi as any])[0]
    expect(mergeLWW([tieHi as any], [tieLo as any])).toEqual([winner])
    expect(mergeLWW([tieLo as any], [tieHi as any])).toEqual([winner])
  })
})
