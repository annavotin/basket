# Scan / add-item UX improvements

Date: 2026-07-09

Four UX changes from real-use feedback, all targeted for the Apple-only App Store
resubmit. Respect the invariants in AGENTS.md (per-unit `weightG`/`kcal`, `quantity`
is a separate multiplier; soft-delete + `markDirty` for synced types).

---

## 1. Pack-size-first scan flow

**Problem:** when a scanned product has serving data, the amount picker defaults to the
first serving ([AddItemSheet.tsx:344](../../../src/components/AddItemSheet.tsx)), and the
pack weight is never offered as a one-tap option. Users buy whole packs, so they must pick
"custom g" and type the pack size every time.

**The data is already there:** the barcode lookup exposes `packageWeightG`
([foodApi.ts:83](../../../src/services/foodApi.ts)); it is `0` when unknown.

**Design:**
- Add a **"Whole pack"** pill to the unit-pill row (with the serving pills and "custom g").
  Label with the weight when known, e.g. `Whole pack · 250 g`.
- **Default selection:** when `packageWeightG > 0`, select "Whole pack" and set the weight
  to `packageWeightG` (instead of `servings[0]`). Servings remain available as pills.
- **Unknown pack size** (`packageWeightG === 0`): select "Whole pack" with an empty weight,
  auto-focus the weight field, show a hint ("Enter the pack size"), and keep **Add disabled**
  until a positive weight is entered. `canAdd` already gates on `weightNum > 0`
  ([AddItemSheet.tsx:432](../../../src/components/AddItemSheet.tsx)) — no new gate needed,
  just make the empty pack state the default and surface the hint.
- **Remember after save:** already wired. On scan, `findCustomByBarcode` is preferred over
  the API ([App.tsx:689](../../../App.tsx)), and a saved food stores the corrected weight as
  `packageWeightG` ([customFoods.ts:27](../../../src/services/customFoods.ts)). Because the
  saved food carries no servings, defaulting to "Whole pack" makes the re-scan use the saved
  pack weight automatically. Verify: a re-scanned, previously-saved barcode loads with the
  saved weight selected, no empty-field prompt.

**Verify:** scan a product with a known pack size → "Whole pack" preselected at that weight.
Scan one with unknown pack size → weight blank, Add disabled, hint shown. Save a corrected
weight → re-scan → saved weight preselected.

## 2. Editable name at add-time

**Problem:** a scanned product's name is plain text
([AddItemSheet.tsx:502](../../../src/components/AddItemSheet.tsx)); only manual items have an
editable name field. Scanned names are often generic or verbose.

**Design:** make the scanned name an editable `TextInput` (reuse the manual-mode name field
styling / `name`+`setName` state that already exist). Keep the detail-sheet rename
([ItemDetail.tsx:268](../../../src/components/ItemDetail.tsx)) as the post-add path.

**Verify:** scan a product, edit the name in the sheet, Add → the item shows the edited name.

## 3. Quantity → Stepper everywhere

**Problem:** adding uses `<Stepper>` ([AddItemSheet.tsx:737](../../../src/components/AddItemSheet.tsx));
editing an existing item uses a numeric keyboard field ([ItemDetail.tsx:72](../../../src/components/ItemDetail.tsx)).

**Design:** in ItemDetail's item edit mode, replace the quantity `renderField` keyboard input
with the shared `<Stepper>` (min 1, max 99), matching the Add sheet. Keep `qtyStr`/save logic
consistent (clamp to >= 1). Only the **quantity** control changes; weight and macros stay as
fields (per the "just quantity" decision).

**Verify:** open an item, edit mode, quantity uses +/- stepper; saving persists the new qty.

## 4. Disable Extras AI estimation

**Problem:** the "Estimate with AI" button in Extras
([ExtraMealSheet.tsx:140](../../../src/components/ExtraMealSheet.tsx)) is not polished enough
to ship.

**Design:** add `EXTRAS_AI_ENABLED: boolean = false` to
[src/config/features.ts](../../../src/config/features.ts). Gate the estimate button (and its
sign-in-required alert path) behind it, so Extras is manual-only (name + calories + macros)
when off. Code stays intact for a one-line re-enable. Mirrors the existing
`EMAIL_AUTH_ENABLED` pattern.

**Verify:** Extras sheet shows no AI button; manual entry still saves. Tests that exercise
estimation `jest.mock` the flag on.

---

## Testing

- Update/add unit tests per surface; `jest.mock('../src/config/features', ...)` where a test
  needs Extras AI on.
- Keep `npx tsc --noEmit` and `npm test` green (68 suites at time of writing; exclude the
  stray `.claude/worktrees/` checkout).

## No em dashes in user-facing copy.
