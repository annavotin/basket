# Design — Nutrition entry, quantity clarity & "My Foods" round-trip

**Date:** 2026-07-02
**Status:** Approved (design); pending spec review → implementation plan

## Summary

Improve the add-item and item-detail food-data experience so that:
1. The detail view shows the **total** amount bought (weight × quantity), not the per-unit weight.
2. Calories and macros are entered/shown in a **user-chosen basis** — per-100g (matches labels) or total — with one clear toggle, so it's never ambiguous which a number means.
3. Macros from a searched/saved food are **shown and editable** in the add flow, so a user can correct the specific product they bought.
4. Users can **save/update a food to their "My Foods" DB** with one visible control, and **link a barcode** to a custom food.
5. Users can **photograph a nutrition label** and have calories + macros extracted to prefill the fields (mirrors receipt scanning).

## Goals / non-goals

**Goals:** clarity (no ambiguous calorie numbers), correctness (total vs per-unit), and a tight custom-food reuse loop. Keep all nutrition **stored canonically**; the basis is a pure view/entry convenience.

**Non-goals:** changing the sync model, changing storage key strings, server-side custom-food sync (My Foods stays local, as today), a full macro-goal tracking UI (that's a separate roadmap item).

---

## Core model — canonical storage + basis toggle

Nutrition is **always stored canonically**:
- `CustomFood`: `kcalPer100g`, `macrosPer100g` (grams per 100 g).
- `FoodItem`: per-unit `kcal`, `macrosPer100g`.

A **basis toggle** `[ per 100g | total ]` controls only how the nutrition block is **shown and entered**. It is one switch for the whole block (calories + protein + carbs + fat move together). The last-used basis is remembered in a new **local** preference.

**"Total" = total for the full amount being added = `weightG × quantity` (call it `G`).**

### Conversion (the crux — implement as a tested pure helper)

Let `G = weightG × max(1, quantity)`.

- **per-100g mode:** fields show/accept `kcalPer100g` and `macrosPer100g.{p,c,f}` directly.
- **total mode:** fields show `value × G / 100`; on edit, canonical `perValue = enteredTotal × 100 / G` (requires `G > 0`).
- Canonical values are the source of truth. Changing weight/qty recomputes the *displayed* total but leaves canonical per-100g unchanged. Editing a *total* field re-derives canonical per-100g from the **current** `G`.
- **`G === 0` (unknown weight):** total mode can't convert; fall back to per-100g entry (disable the total side until a weight is entered).
- **Blank macro fields** stay `undefined` (not coerced to 0), preserving the existing "estimated macros" behavior.

New helper in `src/utils/nutrition.ts` (pure, unit-tested):
```
toBasis(per100: number, G: number, basis): number         // per-100g → displayed
fromBasis(shown: number, G: number, basis): number        // displayed → per-100g
```

### Data-model change (only one)
- `Preferences.nutritionBasis: 'per100g' | 'total'` (default `'per100g'`).
- `DEFAULT_PREFERENCES` gets the default. Persisted in the existing `basket:prefs:v1` blob (local only — no sync, consistent with all other prefs). **No storage-key changes, no migration.**

---

## A · Total quantity in the detail view (#1)

`ItemDetail` "bought" stat card changes from `weightG` to **`weightG × quantity`**:
- Value: `1,500 g`
- When `quantity > 1`, a small subtitle under it: `3 × 500 g`.
- `kcal / 100g` card unchanged (already `kcal/weightG × 100`, i.e. per-100g). Header total kcal already uses `kcal × quantity`.

Files: `src/components/ItemDetail.tsx`.

---

## B · Editable macros + basis toggle in the add sheet & detail (#2, #5)

A shared **nutrition block**:
- Header row: label "Nutrition" + the `[ per 100g | total ]` segmented toggle (bound to `prefs.nutritionBasis`; flipping it updates the pref).
- Four fields: **Calories, Protein, Carbs, Fat**, each labeled with the active basis (e.g. `kcal / 100g` or `kcal total`).
- **AddItemSheet:** selecting a search suggestion prefills all four from the DB values (already carried in `macrosPer100g`/`kcalPer100g` state — just surfaced now) and remains editable. Replaces the current single per-100g calorie field.
- **ItemDetail (edit mode):** same block, replacing the current total-only "Calories" field — fixing today's per-100g (add) vs total (detail) inconsistency.

The block is one component reused in both sheets to avoid divergence.

Files: `src/components/AddItemSheet.tsx`, `src/components/ItemDetail.tsx`, plus a small shared `NutritionFields` component (new, under `src/components/`).

---

## C · Save to "My Foods" + barcode linking (#3, #4)

Replace the silent auto-save (manual adds) and the scattered "Remember" toggle (scanned adds) with **one visible control** at the bottom of the add/edit sheet:

- **"Save to My Foods"** toggle, **default ON**.
  - When adding a brand-new food: "Save to My Foods".
  - When the food matches an existing saved food (by barcode, else by name): **"Update '<name>' in My Foods"**.
- **"Link a barcode"** button, shown when the food has no barcode yet:
  - Opens the barcode scanner (reuse `src/services/scan.ts` camera flow), captures the code, attaches it to the `CustomFood` on save. Shows **"Barcode linked ✓"** afterward.
- On add with the toggle ON → `upsertCustomFood` with the (edited) canonical values + barcode. `CustomFood.barcode` and `findCustomByBarcode` already exist, so a linked barcode makes the food findable on the next scan.

Behavior matrix:
| Case | Toggle label | Barcode |
|---|---|---|
| Fully custom (manual) | Save to My Foods | Link a barcode (optional) |
| Searched + edited | Update '<name>' | keep existing / link if none |
| Scanned | Save to My Foods | already linked (from scan) |

Files: `src/components/AddItemSheet.tsx`, `src/services/customFoods.ts` (already supports barcode upsert), `App.tsx` (wire the save decision; remove the old auto-save-on-manual special case).

---

## D · Nutrition-label OCR (#6) — deferred phase

Mirror the receipt-scan architecture exactly.

- **Edge function** `supabase/functions/scan-label/index.ts` (mirror `scan-receipt`): accepts `{ image, mediaType }`, calls Anthropic (vision) with a prompt to extract **per-100g** `calories, protein, carbs, fat` and `name`. If the label only shows per-serving values, convert using the stated serving size. Return JSON with nulls for anything not found; never invent numbers.
- **Service** `src/services/label-extract.ts` (mirror `receipt-extract.ts`): `parseLabelResponse(data)` → sanitized `{ name?, kcalPer100g, macrosPer100g }` (defensive coercion, pure, unit-tested); `extractLabel(image, invoke)` with the injected `supabase.functions.invoke`.
- **UI:** a **"Scan label"** button in manual add → capture image (reuse `expo-image-picker`/camera + `expo-image-manipulator` downscale) → extract → **prefill the nutrition block in per-100g** for review/edit → save as normal. On failure/offline → silently fall back to manual entry (same as receipt).

**Why deferred:** needs a backend deploy (new edge function + `ANTHROPIC_API_KEY`) and the **pending `expo-image-manipulator` native rebuild** (see `TODO.md`). Not shippable in a JS-only update, so it sits behind the App Store submission.

Files: `supabase/functions/scan-label/index.ts` (new), `src/services/label-extract.ts` (new), `src/components/AddItemSheet.tsx`, `App.tsx` (wire invoke).

---

## Testing

- **Pure:** `toBasis`/`fromBasis` round-trip + `G=0` guard; `parseLabelResponse` (mirror `parseReceiptResponse` tests); `upsertCustomFood` barcode-link cases.
- **Components:** `NutritionFields` toggle conversion; AddItemSheet macro prefill from a suggestion + Save-to-My-Foods toggle + link-barcode; ItemDetail total-quantity stat + edit-mode basis toggle.
- **No live backend:** the edge function is exercised via the injected `invoke` (as receipt scanning is today).
- Keep `npx tsc --noEmit` and the full suite green.

## Phasing

1. **Phase 1 (client-only, no deploy):** Core model + A + B. Highest value, ships in a JS update.
2. **Phase 2 (client-only):** C (Save to My Foods + barcode linking).
3. **Phase 3 (client + backend, deferred):** D (label OCR) — after App Store submission + the image-manipulator rebuild.

## Files touched (summary)
`src/types.ts`, `src/data.ts`, `src/utils/nutrition.ts`, `src/components/AddItemSheet.tsx`, `src/components/ItemDetail.tsx`, new `src/components/NutritionFields.tsx`, `src/services/customFoods.ts`, `App.tsx`; Phase 3: new `src/services/label-extract.ts`, new `supabase/functions/scan-label/index.ts`.

## Open questions
None blocking. Anthropic prompt wording for `scan-label` to be finalized during Phase 3 implementation.
