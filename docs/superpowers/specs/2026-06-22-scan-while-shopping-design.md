# Scan-While-Shopping flow — Design

**Date:** 2026-06-22

> **Revision (2026-06-22, post-build):** after live testing, two refinements shipped on top of
> the original design below:
> 1. **Remember is now gated behind an explicit Edit.** A found scan opens as a *read-only
>    summary + quantity + Add* (trust the DB, add fast). An **Edit** button (top-right of the
>    sheet) reveals editable name / weight / calories **and** the "Remember this item" toggle —
>    because remembering only matters once you've corrected the DB. Not-found scans (manual
>    entry) still show Remember, default on. Implementation: a `editing` state in `AddItemSheet`;
>    `App` defaults `saveForLater=false` for found scans (no save unless edited) and `true` for
>    not-found; tapping Edit flips it on. "Keep scanning" still shows on any scan-opened sheet.
> 2. **Looked-up kcal/100g rounds to the nearest tenth** (`roundTenth` in nutrition.ts, applied
>    in the OFF + USDA lookups), so DB values like `2.84444` read as `2.8`.

## Goal
Make barcode scanning fast enough to do *while you shop*, so it adds almost no time to the
routine. Tap scan → confirm/edit the item in a layover → Save. Two new affordances:
1. **Remember this item** — save/update the item in "My Foods" keyed by its barcode, so the
   *next* scan of that barcode preloads your edited info.
2. **Keep scanning** — a sticky toggle; when on, Save immediately reopens the scanner for the
   next item, so you can rip through a cart without re-tapping the scan button each time.

## Current state (what already exists)
- `App.handleScanBarcode`: native scanner (`scanBarcodeWithCamera`) → preload check
  (`findCustomByBarcode`) → `lookupBarcode` (OFF → USDA) → opens `AddItemSheet` with the product.
- The layover is `AddItemSheet` in **scanned mode** (`product !== null`): editable name / weight /
  calories / quantity, then Add.
- On Add (`App.handleAddItem`), the item is **always** auto-saved to My Foods via
  `customFoodFromItem(item, scanBarcode)` + `upsertCustomFood`. Barcode preload already works.

So this feature is mostly: surface the existing auto-save as a visible toggle, add a sticky
"keep scanning" toggle, and add a re-scan loop. No new lookup or storage machinery.

## Decisions (confirmed with user)
- **Scanner:** the existing real native camera scanner. No dev/simulator mock.
- **Layover:** reuse `AddItemSheet` in scanned mode (Approach A — orchestrate in App). No new
  sheet component.
- **"Remember this item":** default **ON** (opt-out). Per-scan; resets to ON each scan. Replaces
  today's always-on auto-save.
- **"Keep scanning":** **sticky** — persisted to AsyncStorage, default OFF the first time, then
  whatever the user last left it.
- **Stopping the loop:** closing the layover (✕ / backdrop) ends the loop. Save continues it (when
  keep-scanning is on).
- Toggles appear **only when the sheet was opened by a scan**, not on manual `+` adds.

## The loop
1. Tap scan → native scanner (unchanged).
2. Scan → `lookupBarcode` (My Foods preload → OFF → USDA, unchanged) → layover opens with editable
   name / size / calories / quantity.
3. Layover shows two toggle rows above the Add button (scanned mode only):
   - **Remember this item** (default ON)
   - **Keep scanning** (reflects the persisted sticky value)
4. **Save** →
   - add the item to the active basket;
   - if **Remember** is on, `upsertCustomFood(customFoodFromItem(item, barcode))`;
   - close the layover;
   - if **Keep scanning** is on, **after the layover fully dismisses**, reopen the scanner for the
     next item.
5. **Close** (✕ / backdrop) → exit the loop (no add, no rescan). This is how you stop.
6. **Not-found** while looping: layover opens in manual mode as today; Save continues the loop, ✕
   exits. No special-casing.

## Architecture

### State ownership
- `keepScanning: boolean` lives in `App`, persisted to AsyncStorage key `basket:keepScanning:v1`
  (load on mount behind the existing `hydrated` guard, like other persisted prefs). The toggle
  calls a setter that updates state **and writes through to AsyncStorage immediately**, so the
  choice survives the sheet closing and an app restart.
- `saveForLater: boolean` is local to `AddItemSheet`, initialized `true` each time a scanned
  product is shown, reported up through the existing `onAdd`.

### `AddItemSheet` changes
- New props:
  - `scanned?: boolean` — true when the sheet was opened by a barcode scan; gates the toggle rows.
  - `keepScanning: boolean` + `onKeepScanning(next: boolean): void` — controlled sticky toggle.
- Local state `saveForLater` (default `true`), shown as the **Remember this item** toggle.
- `onAdd` signature gains the save choice: `onAdd(item, { saveForLater })`. (Keep-scanning is read
  from App state on the Save path, not passed through the item.)
- When `scanned` is false (manual `+`), the toggle rows are not rendered and `saveForLater` is
  irrelevant (manual adds keep today's always-save behavior).

### `App` changes
- `const [keepScanning, setKeepScanning]` + persistence (load/save AsyncStorage).
- A flag distinguishing a scan-originated sheet from a manual one (e.g. reuse the existing
  `scanBarcode` state, which is already set on scan and cleared on close, or an explicit
  `sheetScanned` boolean). Pass it to `AddItemSheet` as `scanned`.
- `handleAddItem(item, { saveForLater })`:
  - add to cycle (unchanged);
  - if `saveForLater` (and there's a barcode / enough info) → upsert custom food (today's logic,
    now gated by the flag instead of unconditional);
  - after the sheet closes, if `keepScanning` → re-enter the scan flow.
- **Re-scan timing:** reopening launches a native scanner right after the layover `Modal`
  dismisses — the same present-while-dismissing collision just fixed for the loading overlay.
  The loop must wait for the sheet to finish dismissing before calling `scanBarcodeWithCamera`
  again (mirror the 350ms teardown discipline already in `scan.ts`; a short delay or an
  `onDismiss`-driven continuation, whichever the sheet supports cleanly).

## Edge cases
- **Cancel the scanner** (back out without scanning) while looping → loop ends (no barcode → return).
- **Toggling "keep scanning" on then closing** without Save → value still persists (sticky), but no
  rescan happens because Save wasn't pressed.
- **Preloaded item** (barcode already in My Foods): "Remember this item" still defaults ON; Save
  updates the saved entry with any edits (`upsertCustomFood` already matches by barcode).
- **Remember ON but item lacks a barcode** (manual fallback during a not-found): save by name as
  today (`customFoodFromItem` already handles the no-barcode case).

## Testing
- `AddItemSheet`: toggle rows render only when `scanned`; not in manual mode. Save reports
  `saveForLater`. Tapping "Keep scanning" calls `onKeepScanning`. Default `saveForLater` is ON.
- `handleAddItem` save-decision: upserts when `saveForLater`, skips when not.
- `keepScanning` persistence: round-trips through AsyncStorage (load on mount, write on toggle).
- The native rescan loop (scanner reopening) is **verified on-device** — the camera can't run in
  jest/simulator; logic around it is unit-tested, the camera step is not.

## Out of scope
- No dev/simulator fake scanner.
- No batch/multi-add review screen — items land in the basket one at a time as scanned.
- No haptics/sound on add (could be a later polish; silent reopen is the feedback).
