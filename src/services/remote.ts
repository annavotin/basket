export type SyncTable = 'cycles' | 'extra_meals' | 'pantry_items'

export type SyncRecord = { id: string; updatedAt?: string; deletedAt?: string | null } & Record<string, unknown>

/** Backend abstraction. The app talks only to this; SupabaseRemote and InMemoryRemote implement it. */
export interface Remote {
  /** Records with updatedAt strictly greater than `since` (or all, when since is null). */
  pullSince(table: SyncTable, since: string | null): Promise<SyncRecord[]>
  /** Insert-or-replace by id. Soft-deletes are upserts with deletedAt set. */
  upsert(table: SyncTable, rows: SyncRecord[]): Promise<void>
}

/** In-memory Remote for tests and offline default. */
export class InMemoryRemote implements Remote {
  private tables: Record<SyncTable, Map<string, SyncRecord>> = {
    cycles: new Map(), extra_meals: new Map(), pantry_items: new Map(),
  }
  async pullSince(table: SyncTable, since: string | null): Promise<SyncRecord[]> {
    const all = [...this.tables[table].values()]
    if (since == null) return all
    return all.filter((r) => (r.updatedAt ?? '') > since)
  }
  async upsert(table: SyncTable, rows: SyncRecord[]): Promise<void> {
    for (const row of rows) this.tables[table].set(row.id, row)
  }
}
