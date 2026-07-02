# Batch — Architecture

> A local-first meal-prep + calorie tracker. Plan prep cycles, track a daily calorie
> budget, log extra meals and pantry staples, add food by barcode/receipt scan or
> manual entry. Optional account sync via Supabase.

**Stack:** Expo SDK **54** · React Native 0.81 · React 19.1 · TypeScript · Supabase (auth + Postgres + edge function) · Jest + @testing-library/react-native.

> ⚠️ The app targets **Expo SDK 54** (see `package.json`). When you need API docs, read
> `https://docs.expo.dev/versions/v54.0.0/` — not a newer version. See `AGENTS.md`.

---

## 1. Big picture

Batch is **local-first**. AsyncStorage is the source of truth on-device; the UI reads and
writes local state immediately, and an optional background sync engine reconciles three of
those data types with Supabase when the user is signed in. The app is fully usable with **no
account** — sync is purely additive.

```
┌─────────────────────────────────────────────────────────┐
│  App.tsx  (root state + orchestration, ~1180 lines)      │
│   • holds cycles / extraMeals / pantry / prefs / …       │
│   • every mutation → setState → persist → markDirty()    │
│   • runSync() debounced 1.5s, on foreground, on sign-in  │
└───────────────┬─────────────────────────┬───────────────┘
                │                          │
        ┌───────▼───────┐          ┌───────▼──────────┐
        │ src/components │          │  src/services     │
        │  UI: sheets,   │          │  storage, sync,   │
        │  screens,      │          │  remote, auth,    │
        │  pickers       │          │  scan, food APIs  │
        └───────┬───────┘          └───────┬──────────┘
                │                          │
        ┌───────▼───────┐          ┌───────▼──────────┐
        │  src/utils     │          │ AsyncStorage      │
        │  pure helpers  │          │ Supabase / OFF /  │
        │  (dates, kcal) │          │ USDA / Anthropic  │
        └───────────────┘          └──────────────────┘
```

---

## 2. Data model (`src/types.ts`)

| Type | Key fields | Synced? | Storage key |
|---|---|---|---|
| `MealPrepCycle` | `id, startDate, endDate, items[], pantryOverrides?, updatedAt?, deletedAt?` | ✅ `cycles` | `basket:cycles:v1` |
| `ExtraMeal` | `id, date, name, kcal, macros?, updatedAt?, deletedAt?` | ✅ `extra_meals` | `basket:extras:v1` |
| `PantryItem` | `id, name, emoji, kcalPer100g, dailyG, updatedAt?, deletedAt?` | ✅ `pantry_items` | `basket:pantry:v1` |
| `FoodItem` | `name, weightG, kcal, emoji, quantity?, source?, macrosPer100g?` | (embedded in cycle `items`) | — |
| `CustomFood` | `id, name, emoji, kcalPer100g, macrosPer100g?, packageWeightG?, barcode?, createdAt, updatedAt` | ❌ local only | `basket:customFoods:v1` |
| `Preferences` | `name, defaultDays, units, theme, accent, macroTargets` | ❌ **local only** | `basket:prefs:v1` |
| daily goal (number) | — | ❌ local only | `basket:dailyGoal:v1` |
| keep-scanning (bool) | — | ❌ local only | `basket:keepScanning:v1` |
| onboarded (bool) | — | ❌ local only | `basket:v1:onboarded` |

### ‼️ Invariants — do not break these
- **AsyncStorage key strings are frozen.** Renaming a `basket:*:v1` key orphans every existing
  user's data. Add a new key + migration instead. Keys live in `src/services/storage.ts`.
- **`FoodItem.weightG` and `FoodItem.kcal` are PER-UNIT.** `quantity` is a separate multiplier.
  Total weight = `weightG * quantity`; total kcal = `kcal * quantity`. Any code that scales an
  item must apply quantity to **both** sides. (This is the root of the historical `carriedItem`
  bug — see `CODE-REVIEW-2026-07-01.md`.)
- **`prefs` never syncs to the server.** Name, units, theme, accent, calorie goal, macro targets
  are device-local by design. Only `cycles`, `extra_meals`, `pantry_items` sync.
- **Soft-delete only.** Deleting a synced record sets `deletedAt` (a tombstone) and bumps
  `updatedAt` via `touch()` — it is never spliced out, or it would resurrect on next pull.

---

## 3. State & persistence flow

All app state lives in `App.tsx` (`AppInner`). The pattern for every mutation:

```
user action → setCycles/setExtraMeals/setPantry(next)   // 1. update React state
            → touch(record)                              // 2. bump updatedAt (synced types)
            → markDirty(table, id)                       // 3. enqueue for push
            → (effect) persist to AsyncStorage           // 4. write-through
            → (debounced) runSync()                      // 5. reconcile with server
```

- `touch()` / `isLive()` — `src/utils/sync-meta.ts`. `touch` stamps `updatedAt`; a record with
  `deletedAt` set is a tombstone (`isLive` false).
- `markDirty(table, id)` — `App.tsx`, backed by `src/services/sync-queue.ts` (a dirty-id set in
  AsyncStorage). **Forgetting `markDirty` after a mutation = the edit never syncs.** Prefer routing
  new mutations through a shared helper.
- Persistence is write-through via effects in `App.tsx` and the load/save fns in
  `src/services/storage.ts`.

---

## 4. Sync engine (`src/services/`)

Sync is **last-write-wins by `updatedAt`**, push-then-pull, per table.

| File | Responsibility |
|---|---|
| `sync-engine.ts` | `createSyncEngine(remote, store)` — wires queue + cursors + remote. |
| `sync.ts` | `syncTable(table, local, deps)` — push dirty rows, pull since cursor, merge, return next. |
| `sync-queue.ts` | dirty-id set per table (what needs pushing). |
| `sync-cursors.ts` | per-table pull cursor (`max(updatedAt)` seen). |
| `merge.ts` | `mergeLWW` — reconcile local vs remote by newest `updatedAt`. |
| `remote.ts` | `Remote` interface + `InMemoryRemote` (used by tests). |
| `supabase-remote.ts` | real Supabase implementation of `Remote`. |
| `sync-reset.ts` | clears cursors/queue (e.g. on sign-out / account switch). |

**Triggers for `runSync()` (in `App.tsx`):** (1) a 1.5s debounce after any synced-data change
(`SYNC_DEBOUNCE_MS`), (2) app returning to foreground (`AppState`), (3) successful sign-in.

**Tables:** `SyncTable = 'cycles' | 'extra_meals' | 'pantry_items'` (`remote.ts`). Records satisfy
`SyncRecord = { id, updatedAt?, deletedAt? }`.

### Known limitations (documented, not yet fixed — see roadmap)
- **Wall-clock LWW ties.** Two devices editing the same row in the same millisecond resolve by
  a tiebreaker only as strong as `merge.ts` currently implements. No vector clocks / sequence nos.
- **Cursor boundary.** `pullSince` uses strict `>` on the cursor; a row committed at exactly the
  cursor timestamp under read-replica lag can be skipped. Narrow window, real.
- **Non-atomic queue writes.** `markDirty` (fire-and-forget) and `queue.clear` both read-modify-write
  one JSON blob without a lock; a rare interleaving can drop a dirty id.
- **`runSync` re-entrancy.** Three independent triggers can overlap with no mutex (being addressed).

These are acceptable for a single-user, few-devices app but should be understood before relying on
sync for concurrent multi-device editing.

---

## 5. External services

| Service | Used for | Where |
|---|---|---|
| **Supabase Auth** | email + password accounts | `src/services/auth.ts`, `supabase.ts` |
| **Supabase Postgres** | sync of cycles / extra_meals / pantry_items | `supabase-remote.ts`, `supabase/migrations/` |
| **Supabase Edge Function** `scan-receipt` | receipt image → food lines (calls Anthropic) | `src/services/receipt-extract.ts` |
| **Anthropic Claude** | receipt OCR/extraction (server-side only) | via the edge function |
| **Open Food Facts** | barcode → nutrition (**tried first**) | `src/services/foodApi.ts` |
| **USDA FoodData Central** | barcode/nutrition **fallback** | `src/services/usda.ts` |

**Food lookup order:** barcode scan → Open Food Facts → USDA fallback → manual entry.
**Receipt scan:** image → base64 → edge function → Claude → `ReceiptLine[]`; the image is not retained.
`src/services/http.ts` holds fetch/retry helpers; `scan.ts` drives the native camera flow.

Secrets/config: `.env.local` (`EXPO_PUBLIC_*`), e.g. `EXPO_PUBLIC_USDA_API_KEY`. Server secrets
(`ANTHROPIC_API_KEY`) live in Supabase, not the client. See `.env.example`.

---

## 6. UI layer (`src/components/`)

- **Root screens** are composed in `App.tsx`. The home surface has weekly tabs: `basket | extras | pantry`.
- **Sheets** are hand-rolled slide-ups (`Animated.View` over a scrim) — there is **no modal
  library** and **`react-native-safe-area-context` is NOT installed**; home-indicator clearance is a
  hardcoded `paddingBottom: 50`. Watch out: `maxHeight: '90%'` only resolves against a definite-height
  parent (past bug in `ItemDetail`).
- **Theming** flows from `prefs` → `ThemeProvider` / `UnitsProvider` (`src/styles/`). Colours come
  from `palette.ts` (light/dark + accent tuple); fonts from `fonts.ts` (Hanken Grotesk for UI,
  Space Grotesk for numbers).
- Notable complex components: `TimelineView` + `RadialDrumPicker` (careful `PanResponder`/`Animated`
  gesture code — ref-based to avoid stale closures), `AddItemSheet` (759 lines, the add/search/scan
  hub), `OnboardingScreen`.

Reusable primitives live in `src/components/settings/` (`ConfirmDialog`, `Stepper`, `Toggle`,
`Segmented`, …). **Use `ConfirmDialog` for any destructive action.**

---

## 7. Build, run, test

```bash
npm start          # expo start (Metro; JS-only changes hot-reload on device)
npm run ios        # expo run:ios --configuration Release (native rebuild)
npm test           # jest
npx tsc --noEmit   # typecheck (keep this green)
```

- **JS/TS + asset changes** hot-reload via Fast Refresh — no rebuild.
- **Native changes** (new native module, icon/splash, plist) need `expo run:ios`. Open items that
  need a rebuild are tracked in `TODO.md`.
- **Tests** run under babel-jest with native modules mocked in `jest-setup.js`
  (AsyncStorage, expo-font, expo-blur, expo-haptics, expo-crypto, supabase, …). Sync logic is tested
  against `InMemoryRemote`, not a live backend. `transformIgnorePatterns` must allow-list (or a module
  must be mocked) for every native ESM dependency, or its suite fails to parse.

---

## 8. Directory map

```
App.tsx                 root component: state, handlers, sync orchestration
index.ts                entry
src/
  types.ts              all shared types (the data model)
  data.ts               default preferences + seed cycles/pantry/goal
  foods.ts              curated local food database (Add-Item search)
  mockProducts.ts       Product type (prod) + MOCK_PRODUCTS (test-only)
  mockReceipts.ts       test-only receipt fixtures
  components/           UI (sheets, screens, pickers); settings/ = primitives; icons/
  services/             storage, sync*, remote, supabase*, auth, scan, food APIs, http
  utils/                pure helpers: dates, nutrition, units, ids, timelineDrag, receipt, sync-meta
  styles/               palette, colors, fonts, ThemeProvider, UnitsProvider
  hooks/                useSlideIn, useFoodSearch
supabase/               migrations + edge function
docs/                   this file, code review, roadmap, superpowers plans/specs
__tests__/              jest suites; jest-setup.js mocks native modules
```

See `docs/CODE-REVIEW-2026-07-01.md` for the current audit (open bugs, cleanups, dead code) and
`docs/ROADMAP.md` for planned features and larger improvements.
