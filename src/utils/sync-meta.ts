export type SyncMeta = { updatedAt?: string; deletedAt?: string | null }

/** Return a copy with updatedAt set to now (ISO). */
export function touch<T extends object>(record: T): T & { updatedAt: string } {
  return { ...record, updatedAt: new Date().toISOString() }
}

/** A record is live (shown in the UI) unless it carries a non-null deletedAt. */
export function isLive(record: SyncMeta): boolean {
  return record.deletedAt == null
}
