# Extra Meals — Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

Make the "Extra" pills real and interactive. Today they're two hardcoded mock entries (`src/data.ts`) rendered as pink pills with no way to create them. After this:

1. **Every day** in the calendar strip shows a pill above its date. Days with no extra meal show a **very faint pink pill with a faint ＋**. Days with ≥1 extra show the **solid pink "Extra" pill** — exactly **one per day** regardless of count.
2. Tapping either pill selects that day and turns the **bottom ¾ of the screen** into **extra-meal mode** for that day, reusing the meal-prep detail layout.
3. Extra-meal mode lists that day's extras and has a **manual-only ＋ FAB**: pressing it goes straight to a tiny sheet (no scan menu, no database) where the user types a **description** (e.g. "sushi with friends") and a **calorie estimate**, then Saves.
4. Saving creates the extra and the solid pill appears on that day. Adding more extras to the same day is done by tapping the pill again — the day can hold many extras but shows only one pill.
5. Extras can be **removed** (tap-to-remove with the existing confirm dialog).
6. The **BudgetBar** becomes a stacked two-component bar: **green = meal-prep calories, pink = extra calories**, against the budget, with a small legend.
7. Extras **persist** across reloads (AsyncStorage), like cycles.

## Non-goals (YAGNI)

- No database / autofill / weight / quantity for extras — just description + kcal.
- No editing an existing extra (remove + re-add covers it).
- No scan options in extra-meal mode.
- No per-day proration of meal-prep calories (the budget bar in extra mode reuses the containing cycle's numbers; see §BudgetBar).

---

## Data model & persistence

`ExtraMeal` is unchanged and already fits: `{ id: string; date: string; name: string; kcal: number }` (`name` = description, `kcal` = estimate).

`src/services/storage.ts` — add, mirroring `loadCycles`/`saveCycles`:
- `STORAGE_KEY_EXTRAS = 'basket:extras:v1'`
- `loadExtras(deps?): Promise<ExtraMeal[] | null>` — parse, return array or `null` on missing/corrupt/non-array.
- `saveExtras(extras, deps?): Promise<void>` — stringify + setItem, swallow errors.
Factor the existing get/parse/array-guard into a shared internal helper if it reduces duplication, but keep the public `loadCycles`/`saveCycles` signatures intact.

`App.tsx`:
- `extraMeals` becomes state (`useState(initialExtraMeals)` from `src/data.ts`).
- Hydrate in the existing mount effect: after `loadCycles`, also `loadExtras().then(stored => stored && setExtraMeals(stored))`.
- Persist: `useEffect(() => { if (hydrated) saveExtras(extraMeals) }, [extraMeals, hydrated])`.

---

## Selection state

Add `const [activeExtraDate, setActiveExtraDate] = useState<string | null>(null)`.

- `handleExtraPress(date)`: toggle — `setActiveExtraDate(prev => prev === date ? null : date)` and `setActiveCycleId(null)` when selecting (the two modes are mutually exclusive).
- `handleCyclePress(id)` (existing): also `setActiveExtraDate(null)` so picking a cycle leaves extra mode.

The bottom panel chooses its mode:
- `activeExtraDate != null` → **extra-meal mode**.
- else existing cycle logic (NewPeriodPanel / MealPrepDetail).

---

## CalendarStrip

New props: `onExtraPress: (date: string) => void`, `activeExtraDate?: string | null`. (`extraDates` stays — the set of dates that have ≥1 extra.)

Per day, replacing the current `extraPlaceholder`/`extraPill` block (keep the fixed 24px height so date boxes stay aligned):
- **Has extra** (`extraSet.has(date)`): a `TouchableOpacity testID="extra-pill"` with the solid pink pill + "Extra" text, `onPress={() => onExtraPress(date)}`. Subtle active treatment (e.g. border) when `date === activeExtraDate`.
- **No extra**: a `TouchableOpacity testID="add-extra"` with a **very faint** pink pill containing a faint **＋**, `onPress={() => onExtraPress(date)}`.

Colors (`src/styles/colors.ts`) — add:
- `extraPillFaint: '#F7D6E2'` (very faint pink) and `extraPillFaintText: '#C98AA6'` (faint ＋).
Keep `extraPill`/`extraPillText` for the solid pill.

---

## Extra-meal mode (bottom ¾)

App renders, when `activeExtraDate != null`, inside `detailArea`:
```
<BudgetBar mealPrepKcal=… extraKcal=… budgetKcal=… />
<ExtraMealDetail date={activeExtraDate} extras={extrasForDate} onRemoveExtra={…} />
<AddFab manualOnly onAddManual={() => handleAddExtra(activeExtraDate)} />
```

**`src/components/ExtraMealDetail.tsx`** (new): mirrors `MealPrepDetail`'s container/card styling.
- Header line: `Extra meals · {formatted date}`.
- For each extra on that date: a card (`testID="extra-item"`) showing the description and `{kcal} kcal`, plus a `testID="remove-extra"` ✕ control calling `onRemoveExtra(id)`.
- Empty state when none: "No extra meals yet — tap ＋ to add one."
- Props: `{ date: string; extras: ExtraMeal[]; onRemoveExtra: (id: string) => void }`.

**`src/components/ExtraMealSheet.tsx`** (new): a minimal modal mirroring `AddItemSheet`'s sheet chrome/styles.
- Fields: `testID="extra-desc-input"` (description), `testID="extra-kcal-input"` (numeric calories).
- `testID="save-extra-button"` → emits `{ name, kcal }`; guarded (disabled until description non-empty and kcal > 0). `testID="cancel-button"` closes.
- Props: `{ visible: boolean; onSave: (draft: { name: string; kcal: number }) => void; onClose: () => void }`.

**App handlers:**
- `handleAddExtra(date)`: opens `ExtraMealSheet` (set a `extraSheetVisible` + remember the date — which is `activeExtraDate`).
- `handleSaveExtra({ name, kcal })`: `setExtraMeals(prev => [...prev, { id: 'extra-' + Date.now(), date: activeExtraDate!, name, kcal }])`, close sheet.
- `handleRemoveExtra(id)`: `Alert.alert('Remove extra meal', 'Remove this extra meal?', [Cancel, destructive Delete → setExtraMeals(prev => prev.filter(e => e.id !== id))])`.

**`AddFab` change:** add `manualOnly?: boolean` and make `onScanBarcode?`/`onScanReceipt?` optional. When `manualOnly`, the FAB press calls `onAddManual` directly with no expanding menu (no rotation/options). Existing callers (cycle mode) keep passing all three props and behave exactly as before.

---

## BudgetBar (stacked green + pink)

New props: `{ mealPrepKcal: number; extraKcal: number; budgetKcal: number }` (replaces `stockedKcal`). Render two stacked fill segments inside the track:
- green segment width = `min(mealPrepKcal, budgetKcal) / budgetKcal` (testID `budget-bar-fill` kept for the green/meal-prep segment).
- pink segment width = `min(extraKcal, max(0, budgetKcal - mealPrepKcal)) / budgetKcal` (testID `budget-bar-extra-fill`), drawn after green so together they never exceed 100%.
- Label: `{mealPrepKcal + extraKcal} / {budgetKcal} kcal`.
- A small legend row: green dot "Meal prep" · pink dot "Extra".
Pink uses `colors.extraPill`; green uses `colors.cycleBar`.

**App supplies the numbers** via one helper used by both modes:
- **Cycle mode** (active cycle): `mealPrepKcal = totalKcal(cycle.items)`, `extraKcal = sum of extras whose date ∈ [cycle.startDate, cycle.endDate]`, `budgetKcal = cycleBudget(dayCount)`.
- **Extra mode**: let `containing = cycles.find(c => date ∈ [start,end])`. If found, use that cycle's three numbers (so the bar shows the same green/pink split, and pink grows as you add). If not in any cycle: `mealPrepKcal = 0`, `extraKcal = sum of extras on that exact date`, `budgetKcal = DAILY_KCAL_GOAL`.

A small pure helper (e.g. in `src/utils/nutrition.ts`) `extrasKcalInRange(extras, start, end)` and `extrasKcalOnDate(extras, date)` keeps this testable.

---

## Testing

Keep camera/`scan.ts`/native out of the jest graph (mock `Alert`, AsyncStorage already mocked globally).

- `nutrition.test.ts` — `extrasKcalInRange` / `extrasKcalOnDate` sums.
- `storage.test.ts` — extras round-trip / null / corrupt.
- `BudgetBar.test.tsx` — green + pink segment widths from the new props; combined never exceeds 100%; legend present. (Update existing assertions to the new prop names.)
- `CalendarStrip.test.tsx` — faint `add-extra` pill on a day with no extra (fires `onExtraPress`); solid `extra-pill` on an extra day (fires `onExtraPress`); exactly one pill per day even with multiple extras on that date.
- `ExtraMealSheet.test.tsx` — Save disabled until valid; valid Save emits `{ name, kcal }`.
- `ExtraMealDetail.test.tsx` — lists the date's extras; empty state; `remove-extra` calls handler with id.
- `AddFab.test.tsx` — `manualOnly` press calls `onAddManual` directly (no menu shown).
- `App.extras.test.tsx` — tap `add-extra` → extra mode renders → save via sheet → an `extra-item` appears and that day now renders `extra-pill`; `remove-extra` (auto-confirmed Alert) removes it; selecting a cycle bar leaves extra mode.

## Verification
- `npx tsc --noEmit` clean; full `npx jest` green.
- `npx expo export` ios + web succeed.
- Never run `npx expo start`.
