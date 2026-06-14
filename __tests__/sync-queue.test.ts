import { makeQueue } from '../src/services/sync-queue'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v) } }
}

describe('makeQueue', () => {
  it('records dirty ids per table and lists them', async () => {
    const q = makeQueue(memStore())
    await q.markDirty('cycles', 'c1')
    await q.markDirty('cycles', 'c2')
    await q.markDirty('extra_meals', 'e1')
    expect((await q.dirtyIds('cycles')).sort()).toEqual(['c1', 'c2'])
    expect(await q.dirtyIds('extra_meals')).toEqual(['e1'])
  })
  it('clears ids after a successful flush', async () => {
    const q = makeQueue(memStore())
    await q.markDirty('cycles', 'c1')
    await q.clear('cycles', ['c1'])
    expect(await q.dirtyIds('cycles')).toEqual([])
  })
  it('persists across instances sharing a store', async () => {
    const store = memStore()
    await makeQueue(store).markDirty('pantry_items', 'p1')
    expect(await makeQueue(store).dirtyIds('pantry_items')).toEqual(['p1'])
  })
})
