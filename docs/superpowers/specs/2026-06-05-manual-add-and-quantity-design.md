# Manual Add + Autofill + Quantity + Delete-Confirm — Design

**Date:** 2026-06-05
**Status:** Approved (approach A)

## Goal

Round of UX features on top of the working barcode/receipt/persistence MVP:

1. **Manual add** from the ＋ button — especially for produce — with **autofill-as-you-type** from a food database.
2. **Autofill source is hybrid:** instant local curated list ranked first, debounced Open Food Facts (OFF) name-search appended.
3. **Scanned-item size is manually adjustable** — the package weight still auto-fills from OFF, but the user can override it if it's wrong.
4. **Quantity** box for buying multiples. Quantity multiplies **calories only**; the displayed weight stays the **per-unit** (single-pack) value.
5. **Delete confirmation** — removing a stocked item prompts a native confirm dialog.

These collapse into **one unified "Add item" sheet** (approach A): manual-add and scanned-product become the same sheet (name + editable weight + quantity), so requirement 3 falls out for free.

## Non-goals (YAGNI)

- Post-add editing of an already-stocked item's weight/kcal (only quantity-at-add-time). Removal already exists.
- Nutrition macros, multi-language OFF results, fuzzy spell-correction, server-side caching of search.
- Replacing the barcode scan path (`scanBarcodeWithCamera` → `lookupProductByBarcode`) — it still feeds this same sheet.

---

## Data model

`FoodItem` (`src/types.ts`) gains one optional field:

```ts
export type FoodItem = {
  name: string
  weightG: number      // per-unit (single pack / produce weight)
  kcal: number         // per-unit calories = kcalForWeight(kcalPer100g, weightG)
  emoji: string
  quantity?: number    // NEW — default treated as 1; calories-only multiplier
  source?: 'barcode' | 'receipt' | 'manual'
}
```

**Budget math** — the only place semantics change. `src/utils/nutrition.ts`:

```ts
export function totalKcal(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.kcal * (item.quantity ?? 1), 0)
}
```

`kcalForWeight` and `cycleBudget` are unchanged. `weightG`/`kcal` remain per-unit; nothing multiplies the stored weight.

---

## Food suggestions

A shared suggestion shape (new, in `src/foods.ts`):

```ts
export type FoodSuggestion = {
  name: string
  emoji: string
  kcalPer100g: number
  packageWeightG?: number   // present for packaged OFF items; absent for produce/local
  source: 'local' | 'off'
}
```

### Local curated data — `src/foods.ts`
- `LOCAL_FOODS: { name; emoji; kcalPer100g }[]` — a curated list of ~60–120 common foods, **produce-heavy** (apple, banana, broccoli, spinach, carrot, potato, tomato, etc.) plus staples (rice, oats, chicken, eggs, milk…). No pack weight (produce is weighed).
- `searchLocalFoods(query: string): FoodSuggestion[]` — case-insensitive substring match on name; prefix matches ranked before mid-string matches; returns `source: 'local'`, capped (~8).
- Pure, synchronous, fully unit-tested.

### OFF name search — `src/services/foodApi.ts` (extend)
- `searchProductsByName(query, deps?): Promise<FoodSuggestion[]>` — OFF search endpoint
  `https://world.openfoodfacts.org/cgi/search.pl?search_terms=<q>&json=1&page_size=20&fields=product_name,product_quantity,quantity,nutriments`
  with the existing `OFF_USER_AGENT` header and injectable `deps.fetch`.
- Map each hit to a `FoodSuggestion` (`source: 'off'`), reusing the existing quantity-parsing (`product_quantity` → `quantity` string → undefined) for `packageWeightG` and `energy-kcal_100g` for `kcalPer100g`. Drop hits with no usable kcal or empty name.
- Returns `[]` on not-ok / parse error / network error (never throws).

### Merge hook — `useFoodSearch(query)` (new, `src/hooks/useFoodSearch.ts`)
- Returns `{ suggestions, loading }`.
- Local results computed synchronously every keystroke (instant).
- OFF results fetched **debounced ~300ms** and only for queries length ≥ 2; appended after local, **deduped by lowercased name** (local wins). `loading` reflects the in-flight OFF request.
- Stale responses ignored (track latest query / abort-by-token). No OFF call for empty/short queries.

---

## The unified "Add item" sheet (`src/components/AddItemSheet.tsx`, evolve)

Opened in two ways, sharing one body:
- **Scanned:** opened with a `product` (from `lookupProductByBarcode`). Name shown read-only; weight prefilled with `packageWeightG` but **editable**; kcal/100g known.
- **Manual:** opened with `product = null`. Name is an input with a live suggestions dropdown.

**Fields (top to bottom):**
1. **Name** — manual: `TextInput` driving `useFoodSearch`; a dropdown lists suggestions (emoji + name + kcal/100g, a small "OFF" tag for remote ones). Tapping a suggestion sets name + `kcalPer100g` (+ prefilled `weightG` if `packageWeightG` present) and collapses the dropdown. Scanned: static product name.
2. **Weight (g)** — `TextInput`, numeric, editable in both modes. Prefilled from pack weight when known; blank for produce.
3. **Quantity** — stepper (− / value / ＋), min 1, default 1. `testID="qty-decrement"`, `qty-increment`, `qty-value`.
4. **Calories** —
   - When a `kcalPer100g` is known (suggestion or scan): show a **read-only live preview** `kcalForWeight(kcalPer100g, weightG)` per unit, and a total line `× qty` when qty > 1.
   - When the user typed a free name with **no** kcal/100g source: show an editable **"Calories per 100g"** field so the same weight×qty math always applies.
5. **Add to period** button → emits a `FoodItem`:
   ```ts
   {
     name, emoji,
     weightG: <entered weight>,
     kcal: kcalForWeight(kcalPer100g, weightG),  // per-unit
     quantity: <stepper value>,
     source: product ? 'barcode' : 'manual',
   }
   ```

Keyboard-dismiss behavior and styling follow the current sheet. Existing `testID`s (`add-item-sheet`, `add-item-button`, `cancel-button`, `manual-name-input`, `weight-input`) are preserved where they still apply; `product-weight` becomes the editable weight input.

---

## Entry points

- **`AddFab`** — add a third expanding option `testID="fab-manual"` ("Add manually") alongside Scan Barcode / Scan Receipt. New prop `onAddManual: () => void`.
- **`NewPeriodPanel`** — add an "Add manually" affordance (`testID="manual-add"`) beside the two scan cards. New prop `onAddManual: () => void`.
- **`App.tsx`** — `handleAddManual()` opens the sheet with `product = null`.

---

## Delete confirmation

`App.handleRemoveItem(index)` wraps the actual removal in a native dialog:

```ts
Alert.alert('Remove item', 'Remove this item from the period?', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'Delete', style: 'destructive', onPress: () => removeAt(index) },
])
```

`MealPrepDetail`'s `remove-item` control is unchanged; only `App` gains the confirm. `Alert` is mocked in tests to assert the destructive action removes the row and Cancel leaves it.

---

## Display (`MealPrepDetail`)

Each card shows per-unit weight and the **quantity-aware** calories: `{weightG}g · {kcal × (quantity ?? 1)}kcal`, plus a `×N` badge when `quantity > 1`. Layout otherwise unchanged.

---

## Testing

Keep camera / `scan.ts` / native modules out of the jest graph (mock as already done; `Alert` and OFF fetch mocked).

- `foods.test.ts` — `searchLocalFoods` ranking, case-insensitivity, cap, empty query.
- `foodApi.test.ts` — extend: `searchProductsByName` maps hits, parses pack weight via existing logic, drops kcal-less/empty hits, `[]` on error.
- `useFoodSearch.test.ts(x)` — local-instant + debounced-OFF merge, dedupe (local wins), no OFF call for short/empty queries, stale-response handling (fake timers).
- `AddItemSheet.test.tsx` — extend: suggestion tap fills name/kcal/weight; editable scanned weight recomputes preview; quantity stepper; free-item "calories per 100g" path; emitted `FoodItem` shape incl. `quantity`.
- `nutrition.test.ts` — extend: `totalKcal` multiplies by `quantity`, treats missing quantity as 1.
- `App` tests — `handleAddManual` opens the sheet; delete now goes through `Alert` (mock confirm → removed; mock cancel → kept).
- `AddFab` / `NewPeriodPanel` — new manual entry point fires its callback.

## Verification
- `npx tsc --noEmit` clean; full `npx jest` green.
- `npx expo export` ios + web both succeed.
- Never run `npx expo start`.
