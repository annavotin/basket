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
  // markDirty (fire-and-forget at mutation sites) and clear (during a sync pass) both
  // read-modify-write the same JSON blob. Run every op through this chain so concurrent
  // calls queue up instead of interleaving and dropping a dirty id.
  let chain: Promise<unknown> = Promise.resolve()
  function enqueue<T>(op: () => Promise<T>): Promise<T> {
    const result = chain.then(op)
    chain = result.catch(() => {})
    return result
  }
  return {
    markDirty(table: SyncTable, id: string): Promise<void> {
      return enqueue(async () => {
        const data = await readAll()
        const set = new Set(data[table] ?? [])
        set.add(id)
        data[table] = [...set]
        await writeAll(data)
      })
    },
    dirtyIds(table: SyncTable): Promise<string[]> {
      return enqueue(async () => (await readAll())[table] ?? [])
    },
    clear(table: SyncTable, ids: string[]): Promise<void> {
      return enqueue(async () => {
        const data = await readAll()
        data[table] = (data[table] ?? []).filter((x) => !ids.includes(x))
        await writeAll(data)
      })
    },
  }
}
