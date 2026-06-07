# Pantry + Profile + Edit + Timeline cleanup — Plan

> **For agentic workers:** subagent-driven, TDD per task. Steps use `- [ ]`. Implemented autonomously overnight per user request ("implement as you see best"); design decisions are documented here for morning review.

**Constraints:** `npx tsc --noEmit` clean + full `npx jest` green after every task. NEVER `npx expo start`. Keep camera/`scan.ts`/web-only modules out of the jest graph. Commit each task. Work dir: `/Users/annavotin/personal/coding-proj/basket`.

## Design decisions (judgment calls — flag for user)
1. **Empty period discard:** when you navigate away from (deselect/switch off) a cycle that has **0 items**, it's removed entirely — so a mis-started "New shop" can be redone. Applies to any empty cycle, not just brand-new ones (an empty period is meaningless).
2. **Daily goal:** becomes user-configurable (default 2000), persisted, edited on a Profile screen. Replaces the `DAILY_KCAL_GOAL` constant at runtime (constant stays as the default seed).
3. **Timeline declutter:** the per-meal **extra pills in `TimelineView`** (the named ones under the bars) are removed. The `CalendarStrip` "Extra"/＋ pills above the dates stay — they're the interactive indicator, and details show on tap.
4. **Edit food:** tapping a food card in `MealPrepDetail` opens an edit sheet (name, weight, calories, quantity). Calories edited as the per-unit total (matches `FoodItem.kcal`).
5. **Pantry:** staples eaten regularly but bought infrequently (e.g. oats 40 g/day). Managed on a Pantry screen with a default daily gram amount. Each meal-prep period auto-includes `dailyG × periodDays`, **editable per period** (stored as an override on the cycle). Pantry calories **contribute to the period's budget** by folding into the green "meal prep" total of the BudgetBar (kept 2-color).

---

## Task 1: Declutter timeline (remove extra pills)

**Files:** `src/components/TimelineView.tsx`, `__tests__/TimelineView.test.tsx`; touch `App.tsx` (drop the `extraMeals` prop).

- [ ] Remove the `{extraMeals.map(...)}` block (the `testID="extra-pill"` views), the `extraPill`/`extraPillText` styles, the `extraMeals`/`ExtraMeal` imports+prop, and `EXTRA_HEIGHT` offsets. New layout: `ROW_HEIGHT = BAR_HEIGHT + 16`; bars and empty slots use `top: 8` (no extra row).
- [ ] In `App.tsx`, remove `extraMeals={extraMeals}` from `<TimelineView .../>`.
- [ ] Update `__tests__/TimelineView.test.tsx`: drop assertions about extra pills / the `extraMeals` prop; keep cycle-bar + empty-slot tests (add `extraMeals`-free render). Ensure no test references the removed `extra-pill` from TimelineView (CalendarStrip's `extra-pill` test is separate and stays).
- [ ] tsc clean; full jest green. Commit: `feat: declutter timeline — drop per-meal extra pills (kept on calendar strip)`.

---

## Task 2: Discard empty period when deselected

**Files:** `App.tsx`; Test `__tests__/App.emptyPeriod.test.tsx` (new).

Add a selection helper and route all selection changes through it:
```tsx
function changeSelection(nextCycleId: string | null, nextExtraDate: string | null) {
  setCycles((prev) =>
    prev.filter((c) => !(c.id === activeCycleId && c.items.length === 0 && c.id !== nextCycleId))
  )
  setActiveCycleId(nextCycleId)
  setActiveExtraDate(nextExtraDate)
}

function handleCyclePress(id: string) {
  changeSelection(activeCycleId === id ? null : id, null)
}
function handleExtraPress(date: string) {
  changeSelection(null, activeExtraDate === date ? null : date)
}
```
And in `handleCreatePeriod`, discard a currently-active empty cycle before adding the new one:
```tsx
function handleCreatePeriod(startDate: string) {
  const id = `cycle-${Date.now()}`
  const newCycle = { id, startDate, endDate: addDays(startDate, DEFAULT_DAYS - 1), items: [] }
  setCycles((prev) => [
    ...prev.filter((c) => !(c.id === activeCycleId && c.items.length === 0)),
    newCycle,
  ])
  setActiveExtraDate(null)
  setActiveCycleId(id)
}
```

- [ ] **Test** `__tests__/App.emptyPeriod.test.tsx`: mock `../src/services/scan`; fake timers @ a date with NO seeded cycle active so we control state. Render `<App/>`, tap an `empty-slot` to create a period (a `cycle-bar` with "New shop" appears + `new-period-panel`), then tap that `cycle-bar` again (deselect) → the new-shop bar disappears (no `new-period-panel`, and `cycle-bar` count returns to the seeded count). Also: create a period, then tap a different `empty-slot` → only one empty new period exists at a time.
- [ ] tsc clean; full jest green. Commit: `feat: discard an empty meal-prep period when you navigate away`.

---

## Task 3: Configurable daily calorie goal + Profile screen

**Files:** `src/services/storage.ts` (+test), `src/components/ProfileScreen.tsx` (new, +test), `App.tsx`.

**Storage** — add (mirror existing):
```ts
export const STORAGE_KEY_DAILY_GOAL = 'basket:dailyGoal:v1'
export async function loadDailyGoal(deps: StorageDeps = defaultDeps): Promise<number | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_DAILY_GOAL)
    if (raw == null) return null
    const n = JSON.parse(raw)
    return typeof n === 'number' && n > 0 ? n : null
  } catch { return null }
}
export async function saveDailyGoal(goal: number, deps: StorageDeps = defaultDeps): Promise<void> {
  try { await deps.storage.setItem(STORAGE_KEY_DAILY_GOAL, JSON.stringify(goal)) } catch {}
}
```
Add storage tests mirroring the extras ones (round-trip, null, corrupt, non-number → null, save swallows errors).

**ProfileScreen** (`src/components/ProfileScreen.tsx`) — full-screen `Modal` (animationType slide), uses `DismissArea` chrome style. Props `{ visible: boolean; dailyGoal: number; onSave: (goal: number) => void; onClose: () => void }`. A numeric `TextInput` (testID `daily-goal-input`) prefilled with `String(dailyGoal)`, a Save button (testID `save-profile`, disabled unless value > 0) calling `onSave(parseInt)`, and a Close (testID `profile-close`). Title "Profile". Keep it minimal. Test: edit value, Save emits the number; Save disabled when blank/0.

**App wiring:**
- State: `const [dailyGoal, setDailyGoal] = useState(DAILY_KCAL_GOAL)`, `const [profileVisible, setProfileVisible] = useState(false)`.
- Hydrate in mount effect: `loadDailyGoal().then(g => { if (!cancelled && g) setDailyGoal(g) })`.
- Persist: `useEffect(() => { if (hydrated) saveDailyGoal(dailyGoal) }, [dailyGoal, hydrated])`.
- Replace the three `DAILY_KCAL_GOAL` uses in the `bar*` computation with `dailyGoal`.
- Header: replace the greeting row with a row containing "Welcome back!" + a right-aligned button `testID="open-profile"` (label "⚙ Profile"). (Pantry button added in Task 6.)
- Render `<ProfileScreen visible={profileVisible} dailyGoal={dailyGoal} onSave={(g)=>{setDailyGoal(g); setProfileVisible(false)}} onClose={()=>setProfileVisible(false)} />`.
- [ ] tsc clean; full jest green. Commit: `feat: configurable daily calorie goal with a Profile screen`.

---

## Task 4: Edit a food item

**Files:** `src/components/EditItemSheet.tsx` (new, +test), `src/components/MealPrepDetail.tsx` (+test), `App.tsx`.

**EditItemSheet** — modal mirroring `ExtraMealSheet`/`DismissArea` chrome. Props `{ visible: boolean; item: FoodItem | null; onSave: (item: FoodItem) => void; onClose: () => void }`. Fields prefilled from `item`: name (`edit-name-input`), weight g (`edit-weight-input`), calories total (`edit-kcal-input`), quantity stepper (`edit-qty-decrement`/`edit-qty-value`/`edit-qty-increment`, min 1). Save (`save-edit-button`, disabled unless name non-empty & weight>0) emits `{ ...item, name, weightG, kcal, quantity }` (preserves `emoji`/`source`). `useEffect` re-inits fields when `item`/`visible` changes. Test: prefill shows item values; editing + save emits updated FoodItem; quantity stepper works.

**MealPrepDetail** — add optional `onEditItem?: (index: number) => void`; wrap the `info` block (name+meta) in a `TouchableOpacity testID="edit-item"` calling `onEditItem?.(idx)`. Keep the separate `remove-item` button. Test: tapping `edit-item` fires `onEditItem` with the index.

**App:**
- State `const [editIndex, setEditIndex] = useState<number | null>(null)`.
- `handleEditItem(index)` → `setEditIndex(index)`.
- `handleSaveEdit(updated)` → replace item at `editIndex` in active cycle, then `setEditIndex(null)`.
- Pass `onEditItem={handleEditItem}` to `<MealPrepDetail>`; render `<EditItemSheet visible={editIndex !== null} item={editIndex!=null ? activeCycle?.items[editIndex] ?? null : null} onSave={handleSaveEdit} onClose={() => setEditIndex(null)} />`.
- [ ] tsc clean; full jest green. Commit: `feat: tap a stocked item to edit its details`.

---

## Task 5: Pantry data layer

**Files:** `src/types.ts`, `src/utils/nutrition.ts` (+test), `src/services/storage.ts` (+test), `src/data.ts`.

- `types.ts`: add
  ```ts
  export type PantryItem = { id: string; name: string; emoji: string; kcalPer100g: number; dailyG: number }
  ```
  and add optional `pantryOverrides?: Record<string, number>` to `MealPrepCycle`.
- `nutrition.ts`:
  ```ts
  import { FoodItem, ExtraMeal, PantryItem, MealPrepCycle } from '../types'
  export function pantryGramsForCycle(item: PantryItem, cycle: MealPrepCycle, days: number): number {
    const o = cycle.pantryOverrides?.[item.id]
    return typeof o === 'number' ? o : item.dailyG * days
  }
  export function pantryKcalForCycle(items: PantryItem[], cycle: MealPrepCycle, days: number): number {
    return items.reduce((sum, it) => sum + kcalForWeight(it.kcalPer100g, pantryGramsForCycle(it, cycle, days)), 0)
  }
  ```
  Tests: default = dailyG×days; override respected (incl. 0); kcal sum.
- `storage.ts`: `STORAGE_KEY_PANTRY = 'basket:pantry:v1'` + `loadPantry`/`savePantry` mirroring extras (array of PantryItem). Tests mirror.
- `data.ts`: export a seed `pantry: PantryItem[]` with one example, e.g. `{ id:'pantry-oats', name:'Oats', emoji:'🌾', kcalPer100g:379, dailyG:40 }`.
- [ ] tsc clean; full jest green. Commit: `feat: pantry data layer (type, storage, per-cycle gram/kcal helpers)`.

---

## Task 6: Pantry screen (manage staples)

**Files:** `src/components/PantryScreen.tsx` (new, +test), `App.tsx`.

**PantryScreen** — full-screen `Modal`. Props `{ visible; pantry: PantryItem[]; onAdd: (draft:{name;kcalPer100g;dailyG}) => void; onRemove: (id:string)=>void; onClose: ()=>void }`. Lists each pantry item (`testID="pantry-row"`: name, "{dailyG} g/day · {kcalPer100g} kcal/100g", a remove ✕ `testID="pantry-remove"`). An add form at the bottom: name (`pantry-name-input`), kcal/100g (`pantry-kcal-input`), grams/day (`pantry-grams-input`), Add button (`pantry-add` — disabled unless name non-empty & both numbers > 0) → `onAdd`. Close (`pantry-close`). Emoji defaults to '🥫' (App sets it on add). Editing existing daily amount is out of scope here (remove + re-add); the *per-period* amount is editable in the detail (Task 7). Test: filling the form + Add emits the draft; remove fires with id.

**App wiring:**
- State `const [pantry, setPantry] = useState<PantryItem[]>(initialPantry)` (import seed from data), `const [pantryVisible, setPantryVisible] = useState(false)`.
- Hydrate `loadPantry().then(p => { if(!cancelled && p) setPantry(p) })`; persist `useEffect(() => { if (hydrated) savePantry(pantry) }, [pantry, hydrated])`.
- `handleAddPantry(draft)` → append `{ id:`pantry-${Date.now()}`, emoji:'🥫', ...draft }`. `handleRemovePantry(id)` → filter (wrap in `Alert.alert` confirm like other removes).
- Header: add `testID="open-pantry"` button (label "🥫 Pantry") next to Profile.
- Render `<PantryScreen .../>`.
- [ ] tsc clean; full jest green. Commit: `feat: pantry screen to manage staple foods`.

---

## Task 7: Pantry in the period detail + budget

**Files:** `src/components/MealPrepDetail.tsx` (+test), `App.tsx`.

**MealPrepDetail** — new optional props: `pantry?: PantryItem[]`, `cycleDays?: number`, `onSetPantryGrams?: (id: string, grams: number) => void`. Below the food-items list, if `pantry?.length`, render a **"Pantry" section** (`testID="pantry-section"`): for each pantry item a row (`testID="pantry-detail-row"`) with name, a small numeric `TextInput` (`testID="pantry-grams"`) showing the current grams (`pantryGramsForCycle(item, activeCycle, cycleDays)` as a string) that calls `onSetPantryGrams(item.id, parseInt||0)` on change, and the kcal contribution `kcalForWeight(item.kcalPer100g, grams)`. Use `DismissArea`-safe inputs (these are inside the detail, not a modal — fine on web; the modal-wrapper bug doesn't apply here). Keep layout consistent with food cards.

**App:**
- `handleSetPantryGrams(id, grams)` → set `activeCycle.pantryOverrides[id] = grams` via `setCycles`.
- Pass `pantry={pantry}`, `cycleDays={activeDayCount}`, `onSetPantryGrams={handleSetPantryGrams}` to `<MealPrepDetail>`.
- **Budget:** add pantry kcal into `barMealPrep` for the active cycle and the extra-mode containing cycle:
  `barMealPrep = totalKcal(cycle.items) + pantryKcalForCycle(pantry, cycle, days)`.
- [ ] Tests: `MealPrepDetail.test.tsx` — pantry section renders rows with default grams (dailyG×days) and kcal; changing `pantry-grams` calls `onSetPantryGrams(id, n)`. `nutrition`/App: budget includes pantry kcal. tsc clean; full jest green. Commit: `feat: per-period pantry amounts in detail + pantry calories in budget`.

---

## Final verification
- [ ] `npx tsc --noEmit` clean; full `npx jest` green.
- [ ] `npx expo export -p web --output-dir /tmp/wc && rm -rf /tmp/wc` succeeds.
- [ ] Commit history clean; push `main` (auto-deploys web).
- [ ] No `expo start`; native `ios/` untouched.
