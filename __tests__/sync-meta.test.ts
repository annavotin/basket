import { touch, isLive } from '../src/utils/sync-meta'

describe('touch', () => {
  it('stamps updatedAt with an ISO timestamp and preserves the rest', () => {
    const r = touch({ id: 'a', name: 'x' })
    expect(r.id).toBe('a')
    expect(r.name).toBe('x')
    expect(typeof r.updatedAt).toBe('string')
    expect(Number.isNaN(Date.parse(r.updatedAt!))).toBe(false)
  })
})

describe('isLive', () => {
  it('is true when deletedAt is absent or null, false otherwise', () => {
    expect(isLive({ id: 'a' } as any)).toBe(true)
    expect(isLive({ id: 'a', deletedAt: null } as any)).toBe(true)
    expect(isLive({ id: 'a', deletedAt: '2026-06-12T00:00:00.000Z' } as any)).toBe(false)
  })
})
