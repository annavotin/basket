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

    // `upsert` is a blind overwrite (no server-side LWW guard — see supabase-remote.ts /
    // the migration). A dirty row that is actually stale (e.g. a fresh install's seed data,
    // marked dirty by first-sign-in adoption, racing a load from disk) would otherwise
    // clobber a newer remote row — including a tombstone, resurrecting a deletion made on
    // another device. So before pushing, fetch the *current* remote copy of exactly the
    // dirty ids and only push the ones where the local row actually wins LWW.
    let all: T[] = []
    if (toPush.length) {
      all = (await deps.remote.pullSince(table, null)) as T[]
      const remoteById = new Map(all.map((r) => [r.id, r]))
      const winners = toPush.filter((r) => {
        const theirs = remoteById.get(r.id)
        if (!theirs) return true
        return mergeLWW([r], [theirs])[0] === r
      })
      if (winners.length) await deps.remote.upsert(table, winners)
    }
    await deps.queue.clear(table, dirty)

    const since = await deps.getCursor(table)
    // Reuse the just-fetched full snapshot instead of pulling twice when we already have it;
    // otherwise do the normal incremental pull.
    const incoming = toPush.length ? all : ((await deps.remote.pullSince(table, since)) as T[])
    const merged = mergeLWW(local, incoming)

    const newest = merged.reduce<string | null>((mx, r) => (r.updatedAt && (!mx || r.updatedAt > mx) ? r.updatedAt : mx), since)
    if (newest) await deps.setCursor(table, newest)
    return merged
  } catch (err) {
    // Offline-safe: keep local + the dirty queue so it retries. We surface the error
    // (offline blips included) so genuine failures — RLS, schema, auth — are visible.
    console.warn(`[sync] "${table}" did not sync (kept local, will retry):`, err)
    return local
  }
}
