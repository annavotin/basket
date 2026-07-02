# Code review — 2026-07-01

Full-codebase sweep (App.tsx + `src/` ≈ 8,600 LOC), four parallel reviewers over App/state,
services/sync, components, and utils/deps, then fixes applied by parallel agents + directly.

**Result:** test suite went from **366/382 passing (16 failing, 6 suites unable to even run)** to
**412/412 green**; `tsc --noEmit` clean.

Legend: **Fixed** · **Deferred** (see ROADMAP / needs a decision) · **Known limitation** (by design, documented)

---

## Bugs

### High severity

| # | Bug | File(s) | Status |
|---|---|---|---|
| 1 | `carriedItem` inflated kcal for `quantity>1` (×3 item, carry half = 1485 kcal instead of 495). Existing test masked it. | `utils/nutrition.ts`, `components/CarryOverSheet.tsx` | **Fixed** — `leftG*(kcal/weightG)`; sheet slider/display use total purchased weight; masking test corrected + regression test added. |
| 2 | Test suite red: `expo-haptics` ESM import (via `RadialDrumPicker`) unmocked + an image `require()` with no jest transform → **6 suites failed to even run**. | `jest-setup.js`, `jest.config.js` | **Fixed** — added `expo-haptics` mock + RN asset transform. |
| 3 | `ALL_KEYS` omitted `basket:customFoods:v1` + `basket:keepScanning:v1` → **export dropped custom foods; "clear all"/account-delete left them on device** (undercut the privacy-policy claim). | `services/storage.ts` | **Fixed** — both keys + export labels added; tests updated. |
| 4 | Item edit/delete targets a **positional array index** captured when the sheet opens; a background sync merge that reorders/shrinks `activeCycle.items` mid-edit hits the **wrong item**. `FoodItem` has no stable id. | `App.tsx` (`handleEditItem`, `handleSaveItemPatch`, `handleDetailRemove`, `detailTarget`) | **Deferred** — correct fix is a data-model change (stable `id` on `FoodItem` + backfill migration + rewire `detailTarget`/`MealPrepDetail`). Low frequency (needs concurrent multi-device edit of the same cycle while the sheet is open); held pending an App-Store-timing decision. |

### Medium severity

| # | Bug | File(s) | Status |
|---|---|---|---|
| 5 | `parseInt(weight,10)` truncated fractional grams on a `decimal-pad` field ("12.5" → 12). | `components/AddItemSheet.tsx` | **Fixed** — `parseFloat`. |
| 6 | Saving an item with a cleared weight persisted `weightG:0` with nonzero kcal. | `components/ItemDetail.tsx` | **Fixed** — `if (w <= 0) return` guard. |
| 7 | Saved-food delete was one tap, no confirmation. | `components/CustomFoodsScreen.tsx` | **Fixed** — reuses `ConfirmDialog`. |
| 8 | No re-entrancy guard on `runSync`; three triggers could overlap and stomp each other's merge. | `App.tsx` | **Fixed** — in-flight mutex that coalesces to one trailing pass. |
| 9 | `mergeLWW` broke exact-timestamp ties non-deterministically ("remote wins" by array order). | `services/merge.ts` | **Fixed** — deterministic content-derived tiebreak (same `id` on both sides). |
| 10 | `today`/`windowStart` memoised with `[]` — app left open across midnight showed the wrong day. | `App.tsx` | **Fixed** — refreshes on foreground (`AppState` active). |

### Low / debatable

| # | Bug | File(s) | Status |
|---|---|---|---|
| 11 | Keep-scanning `setTimeout` not cancelled on unmount → could relaunch camera post-teardown. | `App.tsx` | **Fixed** — timer stored in a ref, cleared on unmount. |
| 12 | `macrosFrom` drops **all** macros if any one of protein/carb/fat is missing. | `services/foodApi.ts` | **Deferred** — needs a product decision (partial vs. hide). |
| 13 | USDA barcode fallback can return `foods[0]` unverified against the scanned barcode. | `services/usda.ts` | **Deferred** — narrow fallback path. |
| 14 | `useSlideIn` effect deps `[visible]` but reads `from` — latent stale-closure (no caller triggers it today). | `hooks/useSlideIn.ts` | **Deferred**. |

---

## Known limitations — sync engine (by design; documented, not "bugs to auto-fix")

Wall-clock last-write-wins, no locks/sequence numbers. Fine for single-user / few-devices; auto-rewriting the engine is riskier than the edge cases. Revisit together if multi-device concurrent editing becomes a priority (see ROADMAP).
- Exact-millisecond LWW ties across devices (now *deterministic* via fix #9, not *correct*).
- `pullSince` strict-`>` cursor + read-replica lag can skip a row committed exactly at the cursor.
- `markDirty` / `queue.clear` do non-atomic read-modify-write of one JSON blob; a rare interleaving can drop a dirty id.

---

## Dead code & dependencies (grep-verified)

| Item | Evidence | Status |
|---|---|---|
| `@expo-google-fonts/fredoka`, `/inter`, `/merriweather`, `/nunito`, `expo-status-bar` | zero import sites | **Removed** from `package.json` (+ stale font mocks removed) |
| `components/BasketOptionsSheet.tsx` (+ its test) | not imported anywhere in `App.tsx`/`src`; the ⋮ options flow was replaced by TimelineView long-press edit mode | **Deferred** — dead component; delete or re-wire |
| `components/ExtraMealDetail.tsx` | not imported anywhere; extras now open in the shared `ItemDetail` sheet via `ExtrasPeriodList` | **Deferred** — dead component; delete |
| `@react-native-community/slider` | only a stale jest mock; app uses hand-rolled `TrackSlider` | **Deferred** — remove dep + mock together |
| `mockReceipts.ts` (test-only); `mockProducts.ts` `MOCK_PRODUCTS`/`pickRandomProduct` (test-only; the `Product` *type* is used in prod) | zero prod imports | **Deferred** — move to test fixtures |
| dead exports `ringArcs`, `itemSharePct` (`utils/nutrition.ts`), `dateToIndex` (`utils/dates.ts`), `SyncMeta` type | referenced only by their own tests | **Deferred** — likely the unwired macro-ring UI (see ROADMAP feature #1); wire or delete |

---

## Cleanups worth doing (deferred to ROADMAP)

- **Shared `<BottomSheet>`** — 7+ sheets hand-roll the same modal/scrim/grab-handle skeleton. Highest-leverage refactor; do with on-device verification (sheet layout is fragile).
- **Three stepper implementations** — `settings/Stepper` (shared) vs. a duplicate in `PantryScreen` vs. an inline one in `OnboardingScreen`.
- **Legacy-palette components** — `ReceiptReviewSheet`, `AddFab`, `ExtraMealSheet` still use old palette tokens / no `fonts.*`.
- **`runSync` `console.log` with account email** — gate debug logs behind `__DEV__`, avoid logging PII.
- **`softDelete` helper** — several handlers duplicate the tombstone+markDirty+clear-active pattern.

---

## Verified clean (checked, no action)

- `RadialDrumPicker` / `TimelineView` gesture + `Animated` code — ref-based, leak-free, cleanup present.
- `utils/dates.ts` — UTC-anchored, DST/timezone-safe. `utils/ids.ts` — `Crypto.randomUUID`, collision-safe.
- `useFoodSearch` — correct debounce + monotonic-token stale-response guard.
- `ThemeProvider` / `UnitsProvider` — propagate prefs live, no swallowed updates.
- `utils/timelineDrag.ts` — clamp/collision math correct (prior fix commits held up).

---

## UI changes made this session (user-requested, outside the review)
- Onboarding "You're all set": logo → transparent glyph (removed baked gradient), glow circle lowered + enlarged.
- `ItemDetail` macros: replaced the three misleading "progress" bars (each was a macro's share of the item's own calories) with plain gram values; removed the dead bar calc/styles.
