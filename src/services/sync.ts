import { Remote, SyncTable, SyncRecord } from './remote'
import { mergeLWW } from './merge'

type Queue = {
  dirtyIds(table: SyncTable): Promise<string[]>
  clear(table: SyncTable, ids: string[]): Promise<void>
}
type Deps = {
  remote: Remote
  queue: Queue
  getCursor: (table: SyncTable) => Promise<string | null>
  setCursor: (table: SyncTable, value: string) => Promise<void>
}

/** Push dirty local rows, pull remote changes since the cursor, return the merged local set.
 *  On any remote error (offline) returns local unchanged and leaves the dirty queue intact. */
export async function syncTable<T extends SyncRecord>(table: SyncTable, local: T[], deps: Deps): Promise<T[]> {
  try {
    const dirty = await deps.queue.dirtyIds(table)
    const toPush = local.filter((r) => dirty.includes(r.id))
    if (toPush.length) await deps.remote.upsert(table, toPush)
    await deps.queue.clear(table, dirty)

    const since = await deps.getCursor(table)
    const incoming = (await deps.remote.pullSince(table, since)) as T[]
    const merged = mergeLWW(local, incoming)

    const newest = merged.reduce<string | null>((mx, r) => (r.updatedAt && (!mx || r.updatedAt > mx) ? r.updatedAt : mx), since)
    if (newest) await deps.setCursor(table, newest)
    return merged
  } catch {
    return local
  }
}
