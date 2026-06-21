import { createSupabaseRemote } from '../src/services/supabase-remote'

function makeClient(rows: any[] = []) {
  const state: any = { upserted: null, gtArg: null, table: null, selected: false }
  const client = {
    from(table: string) {
      state.table = table
      const q: any = {
        select() { state.selected = true; return q },
        gt(col: string, val: string) { state.gtArg = { col, val }; return q },
        then(resolve: any) { return Promise.resolve({ data: rows, error: null }).then(resolve) },
        async upsert(payload: any) { state.upserted = { table, payload }; return { error: null } },
      }
      return q
    },
  }
  return { client, state }
}

describe('createSupabaseRemote', () => {
  it('pullSince filters by updated_at when since is set and maps rows to camelCase', async () => {
    const { client, state } = makeClient([
      { id: 'c1', start_date: '2026-06-01', end_date: '2026-06-05', items: [{ n: 'x' }], pantry_overrides: {}, updated_at: '2026-06-05T00:00:00.000Z', deleted_at: null },
    ])
    const remote = createSupabaseRemote(client)
    const got = await remote.pullSince('cycles', '2026-06-02T00:00:00.000Z')
    expect(state.gtArg).toEqual({ col: 'updated_at', val: '2026-06-02T00:00:00.000Z' })
    expect(got[0]).toEqual({ id: 'c1', startDate: '2026-06-01', endDate: '2026-06-05', items: [{ n: 'x' }], pantryOverrides: {}, updatedAt: '2026-06-05T00:00:00.000Z', deletedAt: null })
  })
  it('pullSince without a cursor does not call gt', async () => {
    const { client, state } = makeClient([])
    await createSupabaseRemote(client).pullSince('extra_meals', null)
    expect(state.gtArg).toBeNull()
  })
  it('upsert maps records to snake_case columns', async () => {
    const { client, state } = makeClient()
    await createSupabaseRemote(client).upsert('pantry_items', [
      { id: 'p1', name: 'Oats', emoji: '🌾', kcalPer100g: 389, dailyG: 40, updatedAt: '2026-06-05T00:00:00.000Z' },
    ])
    expect(state.upserted.table).toBe('pantry_items')
    expect(state.upserted.payload).toEqual([
      { id: 'p1', name: 'Oats', emoji: '🌾', kcal_per_100g: 389, daily_g: 40, updated_at: '2026-06-05T00:00:00.000Z' },
    ])
  })
  it('stamps updated_at for legacy rows that lack it (NOT NULL column)', async () => {
    const { client, state } = makeClient()
    await createSupabaseRemote(client).upsert('extra_meals', [
      { id: 'e1', date: '2026-06-10', name: 'Snack', kcal: 200 },
    ])
    const row = state.upserted.payload[0]
    expect(typeof row.updated_at).toBe('string')
    expect(row.updated_at).not.toBeNull()
    expect(() => new Date(row.updated_at).toISOString()).not.toThrow()
  })
  it('throws on a query error so the sync coordinator treats it as offline', async () => {
    const client = { from: () => ({ select: () => ({ then: (r: any) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(r) }) }) }
    await expect(createSupabaseRemote(client as any).pullSince('cycles', null)).rejects.toBeTruthy()
  })
})
