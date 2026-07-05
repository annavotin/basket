import { makeQueue } from '../src/services/sync-queue'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v) } }
}

// Same as memStore, but getItem/setItem yield a tick before resolving — enough for two
// concurrent read-modify-write ops (markDirty/clear) to interleave if they aren't serialized.
function slowStore() {
  const m = new Map<string, string>()
  const tick = () => new Promise((r) => setTimeout(r, 0))
  return {
    getItem: async (k: string) => { await tick(); return m.get(k) ?? null },
    setItem: async (k: string, v: string) => { await tick(); m.set(k, v) },
  }
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

  it('does not drop a dirty id when concurrent markDirty calls interleave (read-modify-write race)', async () => {
    const q = makeQueue(slowStore())
    // Fire two markDirty calls "at once" (fire-and-forget style, like App.tsx's markDirty).
    await Promise.all([q.markDirty('cycles', 'a'), q.markDirty('cycles', 'b')])
    expect((await q.dirtyIds('cycles')).sort()).toEqual(['a', 'b'])
  })

  it('does not resurrect a cleared id when clear races a concurrent markDirty', async () => {
    const store = slowStore()
    const q = makeQueue(store)
    await q.markDirty('cycles', 'a')
    // A sync pass clearing 'a' races a new edit marking 'b' dirty.
    await Promise.all([q.clear('cycles', ['a']), q.markDirty('cycles', 'b')])
    expect((await q.dirtyIds('cycles')).sort()).toEqual(['b'])
  })
})
