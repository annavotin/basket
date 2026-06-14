import { SyncTable } from './remote'

type KV = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }
const KEY = 'basket:syncQueue:v1'

export function makeQueue(store: KV) {
  async function readAll(): Promise<Record<string, string[]>> {
    const raw = await store.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  }
  async function writeAll(data: Record<string, string[]>): Promise<void> {
    await store.setItem(KEY, JSON.stringify(data))
  }
  return {
    async markDirty(table: SyncTable, id: string): Promise<void> {
      const data = await readAll()
      const set = new Set(data[table] ?? [])
      set.add(id)
      data[table] = [...set]
      await writeAll(data)
    },
    async dirtyIds(table: SyncTable): Promise<string[]> {
      return (await readAll())[table] ?? []
    },
    async clear(table: SyncTable, ids: string[]): Promise<void> {
      const data = await readAll()
      data[table] = (data[table] ?? []).filter((x) => !ids.includes(x))
      await writeAll(data)
    },
  }
}
