import { SyncRecord } from './remote'

/** Last-write-wins union of two record sets by id, comparing updatedAt (missing = oldest).
 *  Tombstones (deletedAt set) are ordinary records here — they win if newer and are kept so
 *  the deletion propagates; callers filter tombstones for display via isLive(). On an exact
 *  updatedAt tie (including both missing), the two colliding records necessarily share the
 *  same id — so the tiebreaker instead compares their full serialized content, lexicographically.
 *  That's a stable, content-derived signal (unlike array position), so all devices converge to
 *  the same winner regardless of merge order. */
export function mergeLWW<T extends SyncRecord>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const r of [...local, ...remote]) {
    const existing = byId.get(r.id)
    if (!existing) {
      byId.set(r.id, r)
      continue
    }
    const rTime = r.updatedAt ?? ''
    const existingTime = existing.updatedAt ?? ''
    if (rTime > existingTime) byId.set(r.id, r)
    else if (rTime === existingTime && JSON.stringify(r) > JSON.stringify(existing)) byId.set(r.id, r)
  }
  return [...byId.values()]
}
