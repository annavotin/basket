import { Remote, SyncTable, SyncRecord } from './remote'
import { syncTable } from './sync'
import { makeQueue } from './sync-queue'
import { makeCursors } from './sync-cursors'

type KV = {
  getItem(k: string): Promise<string | null>
  setItem(k: string, v: string): Promise<void>
}

/** Bundles a Remote with the dirty queue + pull cursors over a single KV store.
 *  App talks to this: markDirty on every local mutation, pushPull on each sync trigger. */
export function createSyncEngine(remote: Remote, store: KV) {
  const queue = makeQueue(store)
  const cursors = makeCursors(store)

  return {
    /** Flag a row to be pushed on the next sync. Fire-and-forget at mutation sites. */
    markDirty(table: SyncTable, id: string): Promise<void> {
      return queue.markDirty(table, id)
    },
    /** Mark many rows dirty at once — used to adopt existing local data on first sign-in. */
    async markAllDirty(table: SyncTable, ids: string[]): Promise<void> {
      for (const id of ids) await queue.markDirty(table, id)
    },
    /** Push dirty rows, pull remote changes, return the merged set (tombstones included).
     *  Offline-safe: on any remote error returns `local` unchanged, queue intact. */
    pushPull<T extends SyncRecord>(table: SyncTable, local: T[]): Promise<T[]> {
      return syncTable(table, local, {
        remote,
        queue,
        getCursor: cursors.getCursor,
        setCursor: cursors.setCursor,
      })
    },
  }
}

export type SyncEngine = ReturnType<typeof createSyncEngine>
