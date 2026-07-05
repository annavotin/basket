# Shop tally — design

**Date:** 2026-07-05
**Status:** approved direction (user picked: active-cycle budget, implicit UX — tally strip in the scan loop, no explicit session)
**Feature family:** "Shop mode" v1. Voice-log extras and household cycles are separate, later specs.

## What it is

While scanning barcodes in the store, the Add-item sheet shows a compact **tally strip**: how
full the active cycle's calorie budget is, in kcal and in "days of food", updating live as the
item being confirmed changes quantity. The user learns *at the shelf* whether this basket is
4 days of food or 6 — Batch's "track by the shop, not the spoonful" positioning made visible
at the moment of purchase.

## Why this shape

- The scan-while-shopping loop already exists (keep-scanning relaunches the native scanner
  after each add) and already adds items straight into the **active cycle**. Shop mode v1 is
  purely a *view* on that flow — no new mode, session, or draft concept.
- The native modern scanner (`CameraView.launchScanner`, iOS DataScannerViewController) is
  full-screen native UI; React content cannot overlay it. The tally therefore lives in the
  moment between scans, when the Add-item sheet is up.
- Cost/price tally is **out of scope** (barcodes carry no price; cost tracking is a separate
  roadmap item). An explicit "shop session" with an end-of-shop summary is a possible
  fast-follow, not v1.

## Behaviour

**When it shows.** The strip renders in `AddItemSheet` when both are true:
1. the sheet is in scanned mode (`scanned` prop — the item arrived via barcode), and
2. there is an active cycle to tally against.

Keep-scanning does not gate it: a single mid-shop scan gets the same strip. Manual adds and
receipt review do not show it (different context; not "standing in the store").

**What it shows.** One compact line + progress bar, mirroring the home bar's semantics:

- Progress bar: `(basketKcal + pantryKcal + extrasKcal + pendingKcal) / cycleBudget`,
  where the components are the exact same derivation the home surface uses
  (`totalKcal(cycle.items)`, `pantryKcalForCycle`, `extrasKcalInRange`, `cycleBudget`).
  The store view and the home view must never disagree.
- Text: `9,850 / 14,000 kcal · ≈ 4.9 of 7 days`. Days covered = fill fraction × cycle days.
- Pending delta: the item currently being configured in the sheet (per-unit kcal × quantity)
  is included in the fill and shown as `+640` next to the total, updating live as the user
  changes weight/quantity. The bar previews the state *after* tapping Add.
- Over budget: bar caps at 100% and the over-target portion/text switches to the warning
  colour. No blocking, no alerts — information, not judgement.

**Edge cases.**
- No active cycle → strip hidden (scan flow behaves exactly as today).
- `dailyGoal <= 0` or zero-length cycle → hide the "days" figure, keep the kcal line.
- Quantity/weight not yet valid (empty input) → pending delta treated as 0.

## Components & data flow

- **`ShopTallyStrip`** — new small presentational component (`src/components/`), props:
  `{ consumedKcal, pendingKcal, budget, days }`. Pure render; themed via `palette.ts` tokens
  and `fonts.ts` (Space Grotesk for the numbers). No state, no effects.
- **`App.tsx`** — computes the tally inputs for the **active** cycle (note: the existing
  `barMealPrep/barPantry/barExtra` block computes for the *viewed* cycle; the sheet adds to
  the *active* cycle, so the tally needs its own derivation over `activeCycle`) and passes a
  single `shopTally?: { consumedKcal, budget, days }` prop to `AddItemSheet`.
- **`AddItemSheet`** — renders `ShopTallyStrip` under the scanned-product header when
  `scanned && shopTally`, feeding it the live pending kcal it already knows (per-unit kcal ×
  quantity of the item being configured).
- **`src/utils/nutrition.ts`** — no new math beyond a trivial `daysCovered(kcal, budget, days)`
  helper if it keeps the component dumb; reuse existing exports for everything else.

No storage changes, no new AsyncStorage keys, no sync impact, no native changes (JS-only —
hot-reloads, no rebuild, no App Store timing risk).

## Testing

- Unit: tally derivation (consumed/pending/budget/days) including quantity>1 items
  (per-unit kcal × quantity — the historical `carriedItem` bug class), pantry overrides,
  extras in range, zero-budget and no-cycle cases.
- Component: `ShopTallyStrip` renders kcal line, days line, over-budget state; hidden-days
  state when days/goal invalid.
- Sheet integration: `AddItemSheet` shows the strip only in scanned mode with a tally prop.

## Success criteria

- Scanning items into the active cycle shows a strip whose numbers match the home bar for the
  same cycle exactly.
- Adjusting quantity in the sheet moves the bar/delta live.
- `npx tsc --noEmit` and `npm test` stay green; no behaviour change outside scanned mode.
