# Accounts + Cloud Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local-first cloud sync + accounts to Basket: UUID IDs, per-record sync metadata, a remote-repository interface with an in-memory mock, and a sync coordinator (pull/push, last-write-wins, soft-delete, offline queue) — all unit-tested without a backend — then the Supabase auth + remote + SQL that slot in behind those interfaces.

**Architecture:** `AsyncStorage` stays the UI's source of truth. New records get UUIDs and carry `updatedAt`/`deletedAt`. A `Remote` interface abstracts the backend; `InMemoryRemote` is the test/offline default and `SupabaseRemote` is the real one. `sync.ts` merges via last-write-wins by `updatedAt` and flushes a dirty queue when online. Auth is a thin wrapper over `@supabase/supabase-js` with an `expo-secure-store` session adapter.

**Tech Stack:** Expo SDK 54, RN 0.81, TypeScript, Jest. New deps: `expo-crypto` (UUIDs), later `@supabase/supabase-js` + `expo-secure-store`.

**Spec:** `docs/superpowers/specs/2026-06-07-accounts-cloud-sync-backend-design.md`

---

## Phases & buildability

- **Phase 1 (Tasks 1–2) — ID + metadata foundation.** Buildable + testable now. No backend.
- **Phase 2 (Tasks 3–6) — Remote interface + mock + sync engine.** Buildable + testable now against the in-memory mock. No backend.
- **Phase 3 (Tasks 7–12) — Supabase auth, real remote, SQL, migration, account mgmt, App wiring.** **BLOCKED on the user creating a Supabase project** (URL + anon key) — code can be written + unit-tested with a mocked client, but live integration needs the project. Detailed at the end; execute Phase 1–2 first.

---

### Task 1: UUID IDs

**Files:**
- Create: `src/utils/ids.ts`, `__tests__/ids.test.ts`
- Modify: `App.tsx` (3 ID sites), `package.json` (expo-crypto)

- [ ] **Step 1: Install expo-crypto.** Run: `npx expo install expo-crypto`. Expected: `expo-crypto` added to package.json.

- [ ] **Step 2: Write the failing test.** Create `__tests__/ids.test.ts`:
```ts
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-2222-4333-8444-555555555555' }))
import { newId } from '../src/utils/ids'

describe('newId', () => {
  it('returns a uuid from expo-crypto', () => {
    expect(newId()).toBe('11111111-2222-4333-8444-555555555555')
  })
})
```

- [ ] **Step 3: Run, confirm fail.** Run: `npm test -- ids` → FAIL (module not found).

- [ ] **Step 4: Implement `src/utils/ids.ts`:**
```ts
import * as Crypto from 'expo-crypto'

/** A collision-safe id for new records (UUID v4). Time-based ids could collide across devices. */
export function newId(): string {
  return Crypto.randomUUID()
}
```

- [ ] **Step 5: Replace the 3 time-based id sites in `App.tsx`.** Add `import { newId } from './src/utils/ids'`. Then:
  - `id: \`extra-${Date.now()}\`` → `id: newId()`
  - `const id = \`cycle-${Date.now()}\`` → `const id = newId()`
  - `id: \`pantry-${Date.now()}\`` → `id: newId()`
  Add `jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) }))` to the App-level test setup if App tests fail to load expo-crypto — OR add the mock to `jest-setup.js` so all suites get it: `jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-' + Date.now().toString().padStart(12, '0') }))`.

- [ ] **Step 6: Run, confirm pass.** Run: `npm test -- ids` → PASS. Then `npm test` → all green. (If any App test asserted an id starting with `cycle-`/`extra-`/`pantry-`, update it to not depend on the id prefix.)

- [ ] **Step 7: Commit.**
```bash
git add -A
git commit -m "feat: UUID ids for new records (expo-crypto)"
```

---

### Task 2: Sync metadata on records

**Files:**
- Modify: `src/types.ts`
- Create: `src/utils/sync-meta.ts`, `__tests__/sync-meta.test.ts`

- [ ] **Step 1: Add metadata fields.** In `src/types.ts`, add to `MealPrepCycle`, `ExtraMeal`, and `PantryItem` (each gets these two optional fields, keep all existing fields):
```ts
  updatedAt?: string         // ISO; set on every local mutation
  deletedAt?: string | null  // ISO when soft-deleted; null/absent = live
```

- [ ] **Step 2: Write the failing test.** Create `__tests__/sync-meta.test.ts`:
```ts
import { touch, isLive } from '../src/utils/sync-meta'

describe('touch', () => {
  it('stamps updatedAt with an ISO timestamp and preserves the rest', () => {
    const r = touch({ id: 'a', name: 'x' })
    expect(r.id).toBe('a')
    expect(r.name).toBe('x')
    expect(typeof r.updatedAt).toBe('string')
    expect(Number.isNaN(Date.parse(r.updatedAt!))).toBe(false)
  })
})

describe('isLive', () => {
  it('is true when deletedAt is absent or null, false otherwise', () => {
    expect(isLive({ id: 'a' })).toBe(true)
    expect(isLive({ id: 'a', deletedAt: null })).toBe(true)
    expect(isLive({ id: 'a', deletedAt: '2026-06-12T00:00:00.000Z' })).toBe(false)
  })
})
```

- [ ] **Step 3: Run, confirm fail.** Run: `npm test -- sync-meta` → FAIL.

- [ ] **Step 4: Implement `src/utils/sync-meta.ts`:**
```ts
export type SyncMeta = { updatedAt?: string; deletedAt?: string | null }
export type WithId = { id: string }

/** Return a copy with updatedAt set to now (ISO). */
export function touch<T extends object>(record: T): T & { updatedAt: string } {
  return { ...record, updatedAt: new Date().toISOString() }
}

/** A record is live (shown in the UI) unless it carries a non-null deletedAt. */
export function isLive(record: SyncMeta): boolean {
  return record.deletedAt == null
}
```

- [ ] **Step 5: Run, confirm pass.** Run: `npm test -- sync-meta` → PASS. `npm test` → all green.

- [ ] **Step 6: Commit.**
```bash
git add -A
git commit -m "feat: per-record sync metadata (updatedAt/deletedAt) + touch/isLive helpers"
```

---

### Task 3: Remote interface + in-memory mock

**Files:**
- Create: `src/services/remote.ts`, `__tests__/remote.test.ts`

- [ ] **Step 1: Write the failing test.** Create `__tests__/remote.test.ts`:
```ts
import { InMemoryRemote } from '../src/services/remote'

describe('InMemoryRemote', () => {
  it('upserts and pulls everything when since is null', async () => {
    const r = new InMemoryRemote()
    await r.upsert('extra_meals', [{ id: 'e1', updatedAt: '2026-06-01T00:00:00.000Z', name: 'Snack' }])
    expect(await r.pullSince('extra_meals', null)).toHaveLength(1)
  })
  it('pullSince returns only records changed strictly after the cursor', async () => {
    const r = new InMemoryRemote()
    await r.upsert('extra_meals', [
      { id: 'e1', updatedAt: '2026-06-01T00:00:00.000Z' },
      { id: 'e2', updatedAt: '2026-06-03T00:00:00.000Z' },
    ])
    const got = await r.pullSince('extra_meals', '2026-06-02T00:00:00.000Z')
    expect(got.map((x) => x.id)).toEqual(['e2'])
  })
  it('upsert replaces a row by id (last write wins on the stored copy)', async () => {
    const r = new InMemoryRemote()
    await r.upsert('cycles', [{ id: 'c1', updatedAt: '2026-06-01T00:00:00.000Z', endDate: 'a' }])
    await r.upsert('cycles', [{ id: 'c1', updatedAt: '2026-06-05T00:00:00.000Z', endDate: 'b' }])
    const got = await r.pullSince('cycles', null)
    expect(got).toEqual([{ id: 'c1', updatedAt: '2026-06-05T00:00:00.000Z', endDate: 'b' }])
  })
})
```

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- remote` → FAIL.

- [ ] **Step 3: Implement `src/services/remote.ts`:**
```ts
export type SyncTable = 'cycles' | 'extra_meals' | 'pantry_items'

export type SyncRecord = { id: string; updatedAt?: string; deletedAt?: string | null } & Record<string, unknown>

/** Backend abstraction. The app talks only to this; SupabaseRemote and InMemoryRemote implement it. */
export interface Remote {
  /** Records with updatedAt strictly greater than `since` (or all, when since is null). */
  pullSince(table: SyncTable, since: string | null): Promise<SyncRecord[]>
  /** Insert-or-replace by id. Soft-deletes are upserts with deletedAt set. */
  upsert(table: SyncTable, rows: SyncRecord[]): Promise<void>
}

/** In-memory Remote for tests and offline default. */
export class InMemoryRemote implements Remote {
  private tables: Record<SyncTable, Map<string, SyncRecord>> = {
    cycles: new Map(), extra_meals: new Map(), pantry_items: new Map(),
  }
  async pullSince(table: SyncTable, since: string | null): Promise<SyncRecord[]> {
    const all = [...this.tables[table].values()]
    if (since == null) return all
    return all.filter((r) => (r.updatedAt ?? '') > since)
  }
  async upsert(table: SyncTable, rows: SyncRecord[]): Promise<void> {
    for (const row of rows) this.tables[table].set(row.id, row)
  }
}
```

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- remote` → PASS. `npm test` → all green.

- [ ] **Step 5: Commit.**
```bash
git add -A
git commit -m "feat: Remote sync interface + in-memory implementation"
```

---

### Task 4: Last-write-wins merge

**Files:**
- Create: `src/services/merge.ts`, `__tests__/merge.test.ts`

- [ ] **Step 1: Write the failing test.** Create `__tests__/merge.test.ts`:
```ts
import { mergeLWW } from '../src/services/merge'

const A = { id: 'a', updatedAt: '2026-06-01T00:00:00.000Z', v: 1 }
const A2 = { id: 'a', updatedAt: '2026-06-05T00:00:00.000Z', v: 2 }
const B = { id: 'b', updatedAt: '2026-06-02T00:00:00.000Z', v: 1 }

describe('mergeLWW', () => {
  it('keeps the record with the later updatedAt per id', () => {
    expect(mergeLWW([A], [A2])).toEqual([A2])
    expect(mergeLWW([A2], [A])).toEqual([A2])
  })
  it('unions records that exist on only one side', () => {
    const merged = mergeLWW([A], [B])
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })
  it('a remote tombstone (deletedAt) with a later updatedAt wins', () => {
    const tomb = { id: 'a', updatedAt: '2026-06-06T00:00:00.000Z', deletedAt: '2026-06-06T00:00:00.000Z' }
    expect(mergeLWW([A2], [tomb])).toEqual([tomb])
  })
  it('treats a missing updatedAt as oldest', () => {
    const noMeta = { id: 'a', v: 9 }
    expect(mergeLWW([noMeta], [A])).toEqual([A])
  })
})
```

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- merge` → FAIL.

- [ ] **Step 3: Implement `src/services/merge.ts`:**
```ts
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
```
Note: when both sides carry the same id and equal `updatedAt`, the remote copy wins (it's iterated second) — acceptable for LWW.

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- merge` → PASS. `npm test` → all green.

- [ ] **Step 5: Commit.**
```bash
git add -A
git commit -m "feat: last-write-wins record merge"
```

---

### Task 5: Pending-change queue

**Files:**
- Create: `src/services/sync-queue.ts`, `__tests__/sync-queue.test.ts`

- [ ] **Step 1: Write the failing test.** Create `__tests__/sync-queue.test.ts`:
```ts
import { makeQueue } from '../src/services/sync-queue'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v) } }
}

describe('makeQueue', () => {
  it('records dirty ids per table and lists them', async () => {
    const q = makeQueue(memStore())
    await q.markDirty('cycles', 'c1')
    await q.markDirty('cycles', 'c2')
    await q.markDirty('extra_meals', 'e1')
    expect((await q.dirtyIds('cycles')).sort()).toEqual(['c1', 'c2'])
    expect(await q.dirtyIds('extra_meals')).toEqual(['e1'])
  })
  it('clears ids after a successful flush', async () => {
    const q = makeQueue(memStore())
    await q.markDirty('cycles', 'c1')
    await q.clear('cycles', ['c1'])
    expect(await q.dirtyIds('cycles')).toEqual([])
  })
  it('persists across instances sharing a store', async () => {
    const store = memStore()
    await makeQueue(store).markDirty('pantry_items', 'p1')
    expect(await makeQueue(store).dirtyIds('pantry_items')).toEqual(['p1'])
  })
})
```

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- sync-queue` → FAIL.

- [ ] **Step 3: Implement `src/services/sync-queue.ts`:**
```ts
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
```

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- sync-queue` → PASS. `npm test` → all green.

- [ ] **Step 5: Commit.**
```bash
git add -A
git commit -m "feat: persisted pending-change queue for sync"
```

---

### Task 6: Sync coordinator (pull + push, offline-safe)

**Files:**
- Create: `src/services/sync.ts`, `__tests__/sync.test.ts`

- [ ] **Step 1: Write the failing test.** Create `__tests__/sync.test.ts`:
```ts
import { syncTable } from '../src/services/sync'
import { InMemoryRemote } from '../src/services/remote'
import { makeQueue } from '../src/services/sync-queue'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v) } }
}

describe('syncTable', () => {
  it('pushes dirty local rows and pulls remote changes, merged LWW', async () => {
    const remote = new InMemoryRemote()
    // a row already on the server, newer:
    await remote.upsert('extra_meals', [{ id: 'e2', updatedAt: '2026-06-10T00:00:00.000Z', name: 'Server' }])
    const queue = makeQueue(memStore())
    await queue.markDirty('extra_meals', 'e1')
    const local = [
      { id: 'e1', updatedAt: '2026-06-09T00:00:00.000Z', name: 'Local' },
      { id: 'e2', updatedAt: '2026-06-01T00:00:00.000Z', name: 'Stale local' },
    ]
    const result = await syncTable('extra_meals', local, { remote, queue, getCursor: async () => null, setCursor: async () => {} })
    // e1 pushed to server; e2 server copy (newer) wins locally
    expect(await remote.pullSince('extra_meals', null)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'e1', name: 'Local' })])
    )
    expect(result.find((r) => r.id === 'e2')!.name).toBe('Server')
    expect(await queue.dirtyIds('extra_meals')).toEqual([]) // cleared after push
  })

  it('is a no-op-safe offline: a throwing remote leaves local intact and keeps the queue', async () => {
    const throwing = { pullSince: async () => { throw new Error('offline') }, upsert: async () => { throw new Error('offline') } }
    const queue = makeQueue(memStore())
    await queue.markDirty('cycles', 'c1')
    const local = [{ id: 'c1', updatedAt: '2026-06-09T00:00:00.000Z' }]
    const result = await syncTable('cycles', local, { remote: throwing as any, queue, getCursor: async () => null, setCursor: async () => {} })
    expect(result).toEqual(local)
    expect(await queue.dirtyIds('cycles')).toEqual(['c1']) // preserved for next online attempt
  })
})
```

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- sync` → FAIL.

- [ ] **Step 3: Implement `src/services/sync.ts`:**
```ts
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
```

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- sync` → PASS. `npm test` → all green.

- [ ] **Step 5: Commit.**
```bash
git add -A
git commit -m "feat: sync coordinator (push dirty, pull-since, LWW merge, offline-safe)"
```

---

## Phase 3 — Supabase (BLOCKED on the user creating a Supabase project)

These tasks can be **written and unit-tested with a mocked supabase client**, but cannot be run against a live backend until the user creates a Supabase project and provides the **project URL + anon key** (and enables Apple/Google providers). The agent must NOT attempt to create the project, enter credentials, or run live integration. Surface that requirement to the user.

- [ ] **Task 7 — SQL migration (deliverable, user applies).** Write `supabase/migrations/0001_init.sql`: the `profiles`, `preferences`, `cycles`, `extra_meals`, `pantry_items` tables per the spec's data model, each with `user_id uuid default auth.uid()`, `updated_at timestamptz default now()`, nullable `deleted_at`, an `updated_at` trigger, and RLS policies `using (user_id = auth.uid())` for all of select/insert/update/delete. Plus a `delete_account()` SQL function (security definer) that deletes the caller's rows. This file is committed for the user to run via the Supabase SQL editor / CLI. No app code; no test.
- [ ] **Task 8 — `auth.ts` (replace the stub).** `@supabase/supabase-js` + an `expo-secure-store` session adapter; implement `signUp`, `signInWithPassword`, `signInWithApple`, `signInWithGoogle`, `signOut`, `deleteAccount`, `getSession`, `onAuthStateChange` to match the existing `AuthService` interface in `src/services/auth.ts`. Read `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from env. Unit-test each method's success + error path with a **mocked supabase client** (inject the client). Keep `stubAuth` exported as a fallback when env vars are absent so the app still runs offline-only.
- [ ] **Task 9 — `SupabaseRemote implements Remote`.** Map the three tables to/from camelCase records; `pullSince` = `select … gt('updated_at', since)`, `upsert` = `upsert(rows)`. Unit-test the query shape with a mocked client.
- [ ] **Task 10 — Wire sync into App.** Pick the active `Remote` (Supabase when signed in + configured, else `InMemoryRemote`/no-op); call `syncTable` for each table on sign-in, on foreground (AppState), after a debounced local mutation, and on reconnect; mark records dirty via the queue on every mutation (wrap the existing setCycles/setExtraMeals/setPantry with `touch` + `markDirty`); persist cursors in AsyncStorage. Filter `isLive` for display.
- [ ] **Task 11 — First-login migration.** On first successful sign-in with local data and no remote rows: stamp + push all local cycles/extras/pantry/preferences, then pull to reconcile; show a one-time "Syncing your data…" state.
- [ ] **Task 12 — Account management UI wiring.** Wire the existing Settings auth UI to the real `auth.ts`; implement change email/password and the in-app **delete account** (calls `delete_account()` RPC then signs out + clears local). Add Privacy Policy + Terms links in Settings → About.

---

## Self-Review notes
- **Spec coverage:** ID strategy (T1), updated_at/deleted_at (T2), remote repo (T3/T9), LWW + soft-delete + offline (T4–T6), schema/RLS/delete (T7), auth + SecureStore + account mgmt (T8/T12), sync triggers + migration (T10/T11). Realtime is explicitly out of scope (optional in spec).
- **Type consistency:** `SyncRecord`/`SyncTable`/`Remote` defined in T3 and reused in T4/T6/T9; `touch`/`isLive` from T2 used in T10; `newId` from T1 used everywhere new records are created.
- **Buildable-now boundary:** Tasks 1–6 need no backend and are fully unit-tested. Tasks 7–12 are written against mocks but need the user's Supabase project for live verification — do NOT mark them "done/verified" without it.
