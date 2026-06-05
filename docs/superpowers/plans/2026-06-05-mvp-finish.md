# MVP Finish — Pack Size + Products Into the Cycle

> **For agentic workers:** Implement task-by-task with TDD. Steps use checkbox (`- [ ]`) syntax. Builds on the now-working live camera barcode scan (`docs/superpowers/plans/2026-06-04-scan-phase3-camera.md`).

**Context / current state:** Barcode scanning works (native `expo-camera` modern scanner → `lookupProductByBarcode` → `AddItemSheet`). The happy-path "add to period" wiring exists in `App.tsx` (`handleScanBarcode` → `setSheetProduct` → `AddItemSheet.onAdd` → `handleAddItems` → `setCycles`). Two gaps remain for a usable MVP:

1. **Pack size is wrong.** The OFF client only reads `product_quantity` (a *normalized numeric* field that is frequently **absent**). When absent it falls back to `DEFAULT_PACKAGE_G = 100`, so a 200 g pack shows as 100 g. The commonly-populated `quantity` **string** field (`"200 g"`, `"1 kg"`, `"500 ml"`, `"1 L"`) is ignored. We must parse it (with units) as the source of the **whole-package** weight.
2. **Products into the cycle, locked down.** Adding works but is untested end-to-end and there is **no way to remove** a mistakenly-added item. Lock the scan→add path with an integration test and add tap-to-remove so the user can actually manage what's stocked.

**Constraints (hard):**
- **NEVER run `npx expo start`** — it hangs. Use `npx expo export` for bundle checks only.
- Keep `expo-camera` out of the jest graph (no test may import the camera component / `scan.ts`).
- TDD: red → green → commit. Keep `npx tsc --noEmit` clean and the full `npx jest` suite green.
- Don't touch the receipt flow.

---

## Task 1: Parse OFF `quantity` string for whole-package weight

**Files:** `src/services/foodApi.ts`, `__tests__/foodApi.test.ts`

OFF returns package size in two places: `product_quantity` (numeric grams, often missing) and `quantity` (human string like `"200 g"`, `"1.5 kg"`, `"500ml"`, `"1 L"`, `"6 x 25 g"`). Prefer a valid `product_quantity`; otherwise parse `quantity`. Add `quantity` to the requested `FIELDS`. Unit handling: `g`/`ml` → as-is grams; `kg`/`l` → ×1000; bare number → grams. Only fall back to `DEFAULT_PACKAGE_G = 100` when neither yields a positive number.

- [ ] **Step 1 — Failing tests.** Add cases to `__tests__/foodApi.test.ts`:
  - `quantity: "200 g"`, no `product_quantity` → `packageWeightG: 200`.
  - `quantity: "1.5 kg"` → `1500`.
  - `quantity: "500ml"` → `500`.
  - `quantity: "1 L"` → `1000`.
  - `product_quantity: "400"` **and** `quantity: "200 g"` → `400` (numeric wins).
  - neither present → `100` (existing default test stays green).
  - Assert the request URL now contains `quantity` in `fields=`.
- [ ] **Step 2 — Run, verify the new ones fail.**
- [ ] **Step 3 — Implement.** Add `quantity` to `FIELDS`. Add a `parseQuantityG(s: string): number | null` helper (regex `^\s*([\d.,]+)\s*(kg|g|l|ml)?` , normalize `,`→`.`). Resolve weight as: valid `product_quantity` → else `parseQuantityG(p.quantity)` → else `DEFAULT_PACKAGE_G`.
- [ ] **Step 4 — Green. Commit:** `fix: parse OFF quantity string so barcode shows whole-pack weight`.

---

## Task 2: Integration-test the scan→add path + tap-to-remove items

**Files:** `App.tsx`, `src/components/MealPrepDetail.tsx`, `__tests__/MealPrepDetail.test.tsx`, new `__tests__/App.addToCycle.test.tsx`

**2a — Lock the add path (integration test).** Prove that confirming a scanned product appends it to the **active** cycle and it renders in `MealPrepDetail`. Drive it through `App` by selecting/owning an active cycle, opening `AddItemSheet` with a product, tapping `add-item-button`, and asserting a new `food-item` row appears with the product's whole-package weight/kcal. (Mock `./src/services/scan` so no camera is imported; you can also exercise `handleAddItems` by rendering `App` and firing the sheet directly via the `product` prop path.) If any real bug surfaces, fix it in `App.tsx` — do not weaken the test.

**2b — Remove an item.** Add an `onRemoveItem?(index: number)` prop to `MealPrepDetail`; render a `testID="remove-item"` control on each card that calls it. In `App.tsx` add `handleRemoveItem(index)` that removes that item from the active cycle (`setCycles` mapping the active cycle's `items` with a `filter`), and pass it down. Removing the last item returns the cycle to the empty `NewPeriodPanel` state (already handled by existing render logic).

- [ ] **Step 1 — Failing tests:** `MealPrepDetail.test.tsx` — tapping `remove-item` calls `onRemoveItem` with the right index. `App.addToCycle.test.tsx` — scan-confirm adds a `food-item`; then removing it empties the list.
- [ ] **Step 2 — Run, verify fail.**
- [ ] **Step 3 — Implement** the prop + handler.
- [ ] **Step 4 — Green. Commit:** `feat: integration-test scan→cycle add and allow removing stocked items`.

---

## Verification checklist (executor self-review)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx jest` all green (58 existing + new)
- [ ] `npx expo export --platform ios --output-dir /tmp/mvp-ios && npx expo export --platform web --output-dir /tmp/mvp-web` both succeed; then `rm -rf /tmp/mvp-ios /tmp/mvp-web`
- [ ] **No `expo start`** run; no test imports the camera / `scan.ts`
- [ ] Receipt flow untouched

---

## Deferred (NOT in this pass — flag for the human)
- **Persistence:** all state is in-memory `useState`; a reload loses every cycle. `AsyncStorage` persistence is the next real MVP gap but adds a dependency and product decisions (what/when to persist) — left for review rather than built unattended.
- **Editable scanned quantity:** currently the whole package is added as-is; partial-pack entry can come later.
