import { InMemoryRemote } from '../src/services/remote'

describe('InMemoryRemote', () => {
  it('upserts and pulls everything when since is null', async () => {
    const r = new InMemoryRemote()
    await r.upsert('extra_meals', [{ id: 'e1', updatedAt: '2026-06-01T00:00:00.000Z', name: 'Snack' }])
    expect(await r.pullSince('extra_meals', null)).toHaveLength(1)
  })
  it('pullSince returns only records changed strictly after the cursor', async () => {
    const r = new InMemoryRemote()
    await r.upsert('extra_meals', [
      { id: 'e1', updatedAt: '2026-06-01T00:00:00.000Z' },
      { id: 'e2', updatedAt: '2026-06-03T00:00:00.000Z' },
    ])
    const got = await r.pullSince('extra_meals', '2026-06-02T00:00:00.000Z')
    expect(got.map((x) => x.id)).toEqual(['e2'])
  })
  it('upsert replaces a row by id', async () => {
    const r = new InMemoryRemote()
    await r.upsert('cycles', [{ id: 'c1', updatedAt: '2026-06-01T00:00:00.000Z', endDate: 'a' }])
    await r.upsert('cycles', [{ id: 'c1', updatedAt: '2026-06-05T00:00:00.000Z', endDate: 'b' }])
    expect(await r.pullSince('cycles', null)).toEqual([{ id: 'c1', updatedAt: '2026-06-05T00:00:00.000Z', endDate: 'b' }])
  })
})
