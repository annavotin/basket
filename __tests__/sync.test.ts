import { syncTable } from '../src/services/sync'
import { InMemoryRemote } from '../src/services/remote'
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
})
