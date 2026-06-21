/** The persistent sync bookkeeping keys. Must match the KEY constants in sync-queue.ts and
 *  sync-cursors.ts; ADOPTED_KEY is also imported by App.tsx so there is a single definition. */
export const ADOPTED_KEY = 'basket:adopted:v1'
const QUEUE_KEY = 'basket:syncQueue:v1'
const CURSORS_KEY = 'basket:syncCursors:v1'

export const SYNC_METADATA_KEYS = [QUEUE_KEY, CURSORS_KEY, ADOPTED_KEY]

type KV = { removeItem(k: string): Promise<void> }

/** Wipe the dirty queue, pull cursors, and first-login adoption flag — so the device
 *  forgets all sync state (used when deleting the account / resetting to empty). */
export async function clearSyncMetadata(store: KV): Promise<void> {
  for (const key of SYNC_METADATA_KEYS) await store.removeItem(key)
}
