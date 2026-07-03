import { syncTable } from '../src/services/sync'
import { InMemoryRemote, SyncRecord } from '../src/services/remote'
import { makeQueue } from '../src/services/sync-queue'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v) } }
}

describe('syncTable', () => {
  it('pushes dirty local rows and pulls remote changes, merged LWW', async () => {
    const remote = new InMemoryRemote()
    await remote.upsert('extra_meals', [{ id: 'e2', updatedAt: '2026-06-10T00:00:00.000Z', name: 'Server' }])
    const queue = makeQueue(memStore())
    await queue.markDirty('extra_meals', 'e1')
    const local = [
      { id: 'e1', updatedAt: '2026-06-09T00:00:00.000Z', name: 'Local' },
      { id: 'e2', updatedAt: '2026-06-01T00:00:00.000Z', name: 'Stale local' },
    ]
    const result = await syncTable('extra_meals', local, { remote, queue, getCursor: async () => null, setCursor: async () => {} })
    expect(await remote.pullSince('extra_meals', null)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'e1', name: 'Local' })])
    )
    expect(result.find((r) => r.id === 'e2')!.name).toBe('Server')
    expect(await queue.dirtyIds('extra_meals')).toEqual([])
  })

  it('is offline-safe: a throwing remote leaves local intact and keeps the queue', async () => {
    const throwing = { pullSince: async () => { throw new Error('offline') }, upsert: async () => { throw new Error('offline') } }
    const queue = makeQueue(memStore())
    await queue.markDirty('cycles', 'c1')
    const local = [{ id: 'c1', updatedAt: '2026-06-09T00:00:00.000Z' }]
    const result = await syncTable('cycles', local, { remote: throwing as any, queue, getCursor: async () => null, setCursor: async () => {} })
    expect(result).toEqual(local)
    expect(await queue.dirtyIds('cycles')).toEqual(['c1'])
  })

  // Regression: a device's push must not blindly overwrite a remote row that is actually
  // newer — e.g. a second device's first-sign-in "adopt local data" step marks its seed
  // pantry row dirty before it has loaded its real (possibly deleted) local copy from disk.
  // Pushing that stale, timestamp-less row must not resurrect a tombstone another device
  // already wrote to the server.
  it('does not resurrect a remote tombstone when the dirty local row is actually stale', async () => {
    const remote = new InMemoryRemote()
    // Device A already deleted this pantry item and pushed the tombstone.
    await remote.upsert('pantry_items', [
      { id: 'pantry-oats', name: 'Oats', updatedAt: '2026-07-01T00:00:00.000Z', deletedAt: '2026-07-01T00:00:00.000Z' },
    ])

    // Device B: still has the seed row in memory (no updatedAt), marked dirty by adoption.
    const queue = makeQueue(memStore())
    await queue.markDirty('pantry_items', 'pantry-oats')
    const local: SyncRecord[] = [{ id: 'pantry-oats', name: 'Oats', kcalPer100g: 379, dailyG: 40 }]

    const result = await syncTable('pantry_items', local, {
      remote, queue, getCursor: async () => null, setCursor: async () => {},
    })

    const remoteRows = await remote.pullSince('pantry_items', null)
    expect(remoteRows.find((r) => r.id === 'pantry-oats')!.deletedAt).toBe('2026-07-01T00:00:00.000Z')
    expect(result.find((r) => r.id === 'pantry-oats')!.deletedAt).toBe('2026-07-01T00:00:00.000Z')
    // The stale push was dropped, but the dirty flag still clears — the merge below already
    // pulled the authoritative remote row, so there's nothing left to retry.
    expect(await queue.dirtyIds('pantry_items')).toEqual([])
  })

  it('still pushes a dirty row that is genuinely newer than the remote copy', async () => {
    const remote = new InMemoryRemote()
    await remote.upsert('pantry_items', [
      { id: 'p1', name: 'Oats', updatedAt: '2026-07-01T00:00:00.000Z', dailyG: 40 },
    ])
    const queue = makeQueue(memStore())
    await queue.markDirty('pantry_items', 'p1')
    const local = [{ id: 'p1', name: 'Oats', updatedAt: '2026-07-02T00:00:00.000Z', dailyG: 80 }]

    const result = await syncTable('pantry_items', local, {
      remote, queue, getCursor: async () => null, setCursor: async () => {},
    })

    const remoteRows = await remote.pullSince('pantry_items', null)
    expect(remoteRows.find((r) => r.id === 'p1')!.dailyG).toBe(80)
    expect(result.find((r) => r.id === 'p1')!.dailyG).toBe(80)
  })
})
