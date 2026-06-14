import { SyncRecord } from './remote'

/** Last-write-wins union of two record sets by id, comparing updatedAt (missing = oldest).
 *  Tombstones (deletedAt set) are ordinary records here — they win if newer and are kept so
 *  the deletion propagates; callers filter tombstones for display via isLive(). */
export function mergeLWW<T extends SyncRecord>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const r of [...local, ...remote]) {
    const existing = byId.get(r.id)
    if (!existing || (r.updatedAt ?? '') >= (existing.updatedAt ?? '')) byId.set(r.id, r)
  }
  return [...byId.values()]
}
