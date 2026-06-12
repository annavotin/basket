# Spec: Item-detail popup + per-food macros

_2026-06-12_

**Goal:** Add a generic **ItemDetail** bottom-sheet that, on tapping any basket item / extra meal / pantry staple, shows its calories, weight, and **macro breakdown (protein/carbs/fat)**, with an **Edit** mode of tap-to-type fields and an **inline confirm-before-delete**. Introduce a **per-food macro data model** so basket items carry real macros (from the curated catalog and from Open Food Facts), falling back to a kcal-derived estimate when unknown. This is sub-project #2 of the Fresh Matcha redesign.

**Design source of truth:** `/tmp/design-extract/basket/project/basket-modals.jsx` (`ItemDetail`, `MacroList`) and `basket-helpers.jsx` (`itemMacros`). Chat intent: `chats/chat3.md`. Recreate the visual/behaviour, not the prototype's DOM.

---

## Decisions (locked with the user)

- **All three kinds** now: basket item (full edit), extra (name + kcal), pantry staple (kcal-per-100g + daily-g).
- **Real macros from Open Food Facts** for scanned items, in addition to curated-catalog macros; kcal-derived estimate as the fallback.
- **Keep name + quantity** editable in the item detail (no regression from today's `EditItemSheet`, which this replaces).
- **Edit rescales with weight**: weight is primary; changing it live-rescales kcal + macros proportionally; any field can still be directly overridden.

Out of scope (later sub-projects): carry-over modal, search-style add sheet, pantry full-page redesign, accent-setting removal. Also out of scope: switching the Basket-page **aggregate** macro bars from kcal-derived to summed real macros (a small future unification — noted, not done here).

---

## Data model

Add to `src/types.ts`:
```ts
export type Macros = { protein: number; carbs: number; fat: number }
// (MacroTargets already has this shape; alias it: export type MacroTargets = Macros)
```
Extend `FoodItem` with an optional per-100g macro profile (grams per 100 g):
```ts
export type FoodItem = {
  name: string; weightG: number; kcal: number; emoji: string
  quantity?: number; source?: 'barcode' | 'receipt' | 'manual'
  macrosPer100g?: Macros        // NEW — absent on free-typed/legacy items
}
```

**Helper `itemMacros(item: FoodItem): Macros`** (in `src/utils/nutrition.ts`) — returns the item's **total** macro grams (including quantity), mirroring `totalKcal`:
- if `macrosPer100g` present: `{ protein: m.protein * weightG/100 * qty, ... }` where `qty = quantity ?? 1`;
- else: `kcalDerivedMacros(item.kcal * qty)` (the existing estimate).

**Catalog (`src/foods.ts`):** add `macrosPer100g` (realistic g per 100 g) to every `LOCAL_FOODS` entry, and to the `FoodSuggestion` type, so an add carries macros onto the new `FoodItem`. Whoever builds this assigns sensible nutrition values per food (e.g. Apple ≈ {protein 0.3, carbs 14, fat 0.2}); exact values are an implementation detail, not reviewed for precision.

**Open Food Facts (`src/services/foodApi.ts`):** the fetched `nutriments` already drive kcal; also read `proteins_100g`, `carbohydrates_100g`, `fat_100g` and, when present, set `macrosPer100g` on the resulting product/suggestion so scanned items carry real macros. Missing fields → leave `macrosPer100g` undefined (estimate applies).

No persistence migration needed: stored items without `macrosPer100g` simply use the estimate; newly added/edited items gain the field.

---

## ItemDetail component (`src/components/ItemDetail.tsx`)

A `Modal` bottom-sheet matching the app's existing sheet styling (`useColors`, `useMemo` styles, scrim + sheet). Generic over `kind`:

```ts
type DetailTarget =
  | { kind: 'item'; index: number }
  | { kind: 'extra'; id: string }
  | { kind: 'pantry'; id: string }
```

**View mode** (all kinds): header = emoji + name + kcal + source tag (item: Scanned/Receipt/Manual; extra: "Extra meal"; pantry: "Pantry staple"); a kind-specific stat row; **macro bars** (P/C/F, each bar sized by that macro's kcal share — `protein*4 / carbs*4 / fat*9`), labelled "Macros" for items and "Macros · estimated" for extra/pantry; an **Edit** button and a **Remove** button.

Stat rows:
- **item:** bought (g) · kcal/day (`kcal*qty / days`) · kcal/100g (`kcal/weightG*100`).
- **extra:** "Logged {dateLabel}".
- **pantry:** kcal/100g · per-day (g) · total over the period (`dailyG * days` g).

**Edit mode:**
- **item:** tap-to-type **name, weight, kcal, quantity, protein g, carbs g, fat g**. Mechanics: edit state holds `name, qty, weightG`, plus per-100g bases `kcalPer100g` and `macrosPer100g`. Displayed kcal = `round(kcalPer100g * weightG/100)`, displayed macro grams = `round(macroPer100g * weightG/100)`. **Editing weight** recomputes kcal + macro grams from the bases (proportional rescale). **Editing the kcal field** sets `kcalPer100g = entered / weightG * 100`; **editing a macro field** sets that macro's per-100g = `enteredGrams / weightG * 100`. Initial bases come from the item (`macrosPer100g` or, if absent, `kcalDerivedMacros(kcal)` converted to per-100g). On **Save**: write `name, quantity: qty, weightG, kcal: round(kcalPer100g*weightG/100), macrosPer100g`.
- **extra:** tap-to-type name + kcal. Save → `{ name, kcal }`.
- **pantry:** tap-to-type kcal-per-100g + daily-g. Save → `{ kcalPer100g, dailyG }`.

**Delete:** the Remove button reveals an inline confirm ("Delete {name}? This can't be undone." with Cancel / Delete). Confirm → the kind-appropriate remove handler. No `Alert.alert` (the confirm is in-sheet, matching the design).

---

## Wiring (`App.tsx`)

- One `<ItemDetail>` rendered from a `detailTarget: DetailTarget | null` state; `visible = detailTarget !== null`. It resolves the live object from `cycles`/`extraMeals`/`pantry` by index/id each render.
- **Open it from taps:**
  - basket item row in `MealPrepDetail` (home) **and** `BasketPage` item card → `{ kind: 'item', index }` (replaces the current `onEditItem`/EditItemSheet path).
  - extra row in `ExtrasPeriodList` (and `ExtraMealDetail` if it lists extras) → `{ kind: 'extra', id }`.
  - pantry staple row in `PantryPeriodView` → `{ kind: 'pantry', id }` (make the row tappable; the inline grams input stays for quick edits).
- **Save handlers:** `handleSaveItemDetail(index, patch)` updates `cycles[active].items[index]`; `handleSaveExtraDetail(id, patch)` updates `extraMeals`; `handleSavePantryDetail(id, patch)` updates `pantry`.
- **Remove handlers:** reuse/extend existing `handleRemoveItem(index)`, `handleRemoveExtra(id)`, `handleRemovePantry(id)`; called from the in-sheet confirm.
- **Remove the inline ✕ buttons** from `MealPrepDetail` and `ExtrasPeriodList` rows (delete now lives in the detail). Keep the lists' rows tappable to open the detail.
- **Delete `EditItemSheet.tsx`** and its `editIndex` wiring (subsumed by ItemDetail). Update `BasketPage`'s `onItemPress` so App routes it to `setDetailTarget({ kind: 'item', index })`.

---

## Testing (TDD; keep expo-camera/scan out of the jest graph)

- **`itemMacros`**: real per-100g × weight × quantity; estimate fallback equals `kcalDerivedMacros(kcal*qty)` when no profile.
- **OFF extraction** (`foodApi`): a product with `proteins_100g`/`carbohydrates_100g`/`fat_100g` yields `macrosPer100g`; a product missing them yields `undefined`.
- **catalog**: every `LOCAL_FOODS` entry has a `macrosPer100g`.
- **ItemDetail.test.tsx**: for `item` — renders kcal + the three macro grams from a seeded item; entering a new weight rescales the displayed kcal + macros; Save calls the handler with the recomputed `weightG`/`kcal`/`macrosPer100g`/`quantity`; Remove → confirm → calls the remove handler with the index. For `extra` — name/kcal edit + save. For `pantry` — kcal-100g/daily-g edit + save. Macro bars present.
- Full suite green; `EditItemSheet` test removed with the component.

## Manual verification (device, Release)
Tap a basket item → detail shows macros; Edit → change weight and watch kcal + macros rescale; override a macro; Save and reopen to confirm it stuck. Tap an extra and a pantry staple → their details + edits work. Delete from the sheet asks to confirm. Confirm the basket and extras lists no longer show inline ✕. Scan/add a catalog food and an OFF barcode → both show real macros; a free-typed item shows estimated macros.
