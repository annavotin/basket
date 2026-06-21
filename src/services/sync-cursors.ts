import { SyncTable } from './remote'

type KV = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }
const KEY = 'basket:syncCursors:v1'

/** Per-table pull cursor (the updatedAt of the newest remote change already merged).
 *  pullSince asks the backend only for changes strictly after this, so pulls stay incremental. */
export function makeCursors(store: KV) {
  async function readAll(): Promise<Record<string, string>> {
    const raw = await store.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  }
  return {
    async getCursor(table: SyncTable): Promise<string | null> {
      return (await readAll())[table] ?? null
    },
    async setCursor(table: SyncTable, value: string): Promise<void> {
      const data = await readAll()
      data[table] = value
      await store.setItem(KEY, JSON.stringify(data))
    },
  }
}
