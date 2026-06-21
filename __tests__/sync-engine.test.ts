import { createSyncEngine } from '../src/services/sync-engine'
import { InMemoryRemote, Remote, SyncTable, SyncRecord } from '../src/services/remote'

function memStore() {
  const map = new Map<string, string>()
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
  }
}

const row = (id: string, t: string, over: Partial<SyncRecord> = {}): SyncRecord => ({
  id,
  updatedAt: t,
  ...over,
})

describe('createSyncEngine', () => {
  it('pushes only dirty rows and leaves clean ones in the cloud untouched', async () => {
    const remote = new InMemoryRemote()
    const engine = createSyncEngine(remote, memStore())

    const local = [row('a', '2026-01-01T00:00:00Z'), row('b', '2026-01-02T00:00:00Z')]
    await engine.markDirty('cycles', 'a')
    await engine.pushPull('cycles', local)

    expect(await remote.pullSince('cycles', null)).toEqual([row('a', '2026-01-01T00:00:00Z')])
  })

  it('pulls remote changes and merges them by last-write-wins', async () => {
    const remote = new InMemoryRemote()
    await remote.upsert('extra_meals', [row('x', '2026-03-01T00:00:00Z', { name: 'cloud' })])
    const engine = createSyncEngine(remote, memStore())

    const merged = await engine.pushPull('extra_meals', [
      row('y', '2026-02-01T00:00:00Z', { name: 'local' }),
    ])

    expect(merged.map((r) => r.id).sort()).toEqual(['x', 'y'])
  })

  it('propagates a tombstone (soft delete) up to the cloud', async () => {
    const remote = new InMemoryRemote()
    const engine = createSyncEngine(remote, memStore())

    const deleted = row('p', '2026-04-01T00:00:00Z', { deletedAt: '2026-04-01T00:00:00Z' })
    await engine.markDirty('pantry_items', 'p')
    await engine.pushPull('pantry_items', [deleted])

    const remoteRows = await remote.pullSince('pantry_items', null)
    expect(remoteRows[0].deletedAt).toBe('2026-04-01T00:00:00Z')
  })

  it('advances the cursor so a second pull skips already-seen rows', async () => {
    const remote = new InMemoryRemote()
    await remote.upsert('cycles', [row('a', '2026-01-01T00:00:00Z')])
    const engine = createSyncEngine(remote, memStore())

    const first = await engine.pushPull('cycles', [] as SyncRecord[])
    expect(first.map((r) => r.id)).toEqual(['a'])

    // Nothing new on the remote since the cursor -> pull returns nothing to add.
    const spy = jest.spyOn(remote, 'pullSince')
    await engine.pushPull('cycles', first)
    const sinceArg = spy.mock.calls[0][1]
    expect(sinceArg).toBe('2026-01-01T00:00:00Z')
  })

  it('is offline-safe: a throwing remote returns local unchanged with the queue intact', async () => {
    const throwing: Remote = {
      pullSince: async () => {
        throw new Error('offline')
      },
      upsert: async () => {
        throw new Error('offline')
      },
    }
    const store = memStore()
    const engine = createSyncEngine(throwing, store)
    const local = [row('a', '2026-01-01T00:00:00Z')]
    await engine.markDirty('cycles', 'a')

    const result = await engine.pushPull('cycles', local)
    expect(result).toEqual(local)
    // Dirty flag survived so it retries next time online.
    const raw = await store.getItem('basket:syncQueue:v1')
    expect(JSON.parse(raw as string).cycles).toContain('a')
  })
})
