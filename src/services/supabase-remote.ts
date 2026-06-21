import { Remote, SyncTable, SyncRecord } from './remote'

/** Top-level column maps (camelCase record key -> snake_case DB column) per table.
 *  Only top-level keys are mapped; jsonb values (items, pantry_overrides) pass through
 *  untouched so nested camelCase inside them is preserved. */
const COLS: Record<SyncTable, Record<string, string>> = {
  cycles: { id: 'id', startDate: 'start_date', endDate: 'end_date', items: 'items', pantryOverrides: 'pantry_overrides', updatedAt: 'updated_at', deletedAt: 'deleted_at' },
  extra_meals: { id: 'id', date: 'date', name: 'name', kcal: 'kcal', macros: 'macros', updatedAt: 'updated_at', deletedAt: 'deleted_at' },
  pantry_items: { id: 'id', name: 'name', emoji: 'emoji', kcalPer100g: 'kcal_per_100g', dailyG: 'daily_g', updatedAt: 'updated_at', deletedAt: 'deleted_at' },
}

function toRow(table: SyncTable, rec: SyncRecord): Record<string, unknown> {
  const m = COLS[table]
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(m)) if (rec[k] !== undefined) out[m[k]] = rec[k]
  // updated_at is NOT NULL in every table. Legacy local rows predate the field, so omitting
  // it would violate the constraint and the row would never sync — always send a timestamp.
  if (out['updated_at'] == null) out['updated_at'] = new Date().toISOString()
  return out
}

function fromRow(table: SyncTable, row: Record<string, unknown>): SyncRecord {
  const m = COLS[table]
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(m)) if (row[m[k]] !== undefined) out[k] = row[m[k]]
  return out as SyncRecord
}

/** Remote backed by Supabase. Client passed in (typed loosely) for testability. */
export function createSupabaseRemote(client: any): Remote {
  return {
    async pullSince(table: SyncTable, since: string | null): Promise<SyncRecord[]> {
      let q = client.from(table).select('*')
      if (since) q = q.gt('updated_at', since)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((row: Record<string, unknown>) => fromRow(table, row))
    },
    async upsert(table: SyncTable, rows: SyncRecord[]): Promise<void> {
      const { error } = await client.from(table).upsert(rows.map((r) => toRow(table, r)))
      if (error) throw error
    },
  }
}
