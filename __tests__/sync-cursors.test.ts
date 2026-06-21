import { makeCursors } from '../src/services/sync-cursors'

function memStore() {
  const map = new Map<string, string>()
  return {
    getItem: async (k: string) => map.get(k) ?? null,
    setItem: async (k: string, v: string) => void map.set(k, v),
  }
}

describe('makeCursors', () => {
  it('returns null for an unset table', async () => {
    const c = makeCursors(memStore())
    expect(await c.getCursor('cycles')).toBeNull()
  })

  it('persists and reads back a cursor per table independently', async () => {
    const c = makeCursors(memStore())
    await c.setCursor('cycles', '2026-06-14T10:00:00.000Z')
    await c.setCursor('extra_meals', '2026-06-14T11:00:00.000Z')
    expect(await c.getCursor('cycles')).toBe('2026-06-14T10:00:00.000Z')
    expect(await c.getCursor('extra_meals')).toBe('2026-06-14T11:00:00.000Z')
    expect(await c.getCursor('pantry_items')).toBeNull()
  })

  it('survives a fresh instance over the same store (durable)', async () => {
    const store = memStore()
    await makeCursors(store).setCursor('pantry_items', '2026-06-14T12:00:00.000Z')
    expect(await makeCursors(store).getCursor('pantry_items')).toBe('2026-06-14T12:00:00.000Z')
  })
})
