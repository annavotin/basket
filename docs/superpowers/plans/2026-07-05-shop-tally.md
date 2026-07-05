# Shop Tally Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While scanning barcodes in the store, the Add-item sheet shows a live tally of how full the active cycle's calorie budget is (kcal + "days of food"), including the item being confirmed.

**Architecture:** A new presentational `ShopTallyStrip` component renders inside `AddItemSheet` when the sheet was opened by a barcode scan. `App.tsx` computes the tally inputs over the **active** cycle (the one `handleAddItem` writes into) using the exact same nutrition helpers the home `BudgetBar` uses, and passes them down as one optional prop. The sheet feeds in the live "pending" kcal of the item being configured (per-unit kcal × quantity). JS-only; no storage, sync, or native changes.

**Tech Stack:** Expo SDK 54 / React Native 0.81 / React 19 / TypeScript. Jest + @testing-library/react-native (native modules mocked in `jest-setup.js`). Theme via `useColors()` (`src/styles/ThemeProvider`), units via `useUnits()`, fonts via `src/styles/fonts.ts`.

**Spec:** `docs/superpowers/specs/2026-07-05-shop-tally-design.md`

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `src/components/ShopTallyStrip.tsx` | **create** | Pure presentational strip: kcal line, stacked progress bar (consumed + pending), days-of-food line, over-budget colouring. No state, no effects. |
| `src/components/AddItemSheet.tsx` | modify | Accept optional `shopTally` prop; render the strip in scanned mode, feeding it live pending kcal. |
| `App.tsx` | modify | Derive `shopTally` from the active cycle + pantry + extras + daily goal; pass to `AddItemSheet`. |
| `__tests__/ShopTallyStrip.test.tsx` | **create** | Unit tests for the strip's math and edge cases. |
| `__tests__/AddItemSheet.test.tsx` | modify | Strip shows only in scanned mode with a tally; updates live with quantity. |
| `__tests__/App.addToCycle.test.tsx` | modify | End-to-end wiring: scanning opens the sheet with the strip present. |

Conventions that apply to every task (from `AGENTS.md` / `docs/ARCHITECTURE.md`):
- `FoodItem.weightG`/`kcal` are **per-unit**; `quantity` is a separate multiplier.
- Numbers use `fonts.num` (Space Grotesk), UI text `fonts.display`; colours only via `useColors()` tokens (`palette.ts`). No hardcoded hex.
- No em dashes in user-facing strings.
- Keep `npx tsc --noEmit` and `npm test` green; commit after each task.

---

### Task 1: `ShopTallyStrip` component

**Files:**
- Create: `src/components/ShopTallyStrip.tsx`
- Test: `__tests__/ShopTallyStrip.test.tsx`

The strip receives already-derived numbers and only renders them:

- `consumedKcal` — active cycle's basket + pantry + extras kcal (computed in App, Task 3).
- `pendingKcal` — the item currently being configured in the sheet (per-unit kcal × qty).
- `budgetKcal` — `cycleBudget(days, dailyGoal)`.
- `days` — cycle length in days.

Display rules (from the spec):
- Top row: label `In this batch` (plus ` +N kcal` pending delta when `pendingKcal > 0`) and `total / budget kcal` on the right.
- Stacked bar like `BudgetBar` (`src/components/BudgetBar.tsx` is the styling reference): consumed segment in `matcha`, pending segment in `matchaSoft`, track `sage100`, capped at 100% combined.
- Days line: `≈ X.X of N days of food`, where days covered = `(total / budget) × days`, one decimal, **uncapped** (can read `8.2 of 7`).
- Over budget (`total > budget`): consumed fill switches to `rose`, kcal + days text to `roseDeep`. Information, not judgement — no alerts.
- `budgetKcal <= 0` (zero-length cycle or no daily goal): render only the label + total kcal; no bar, no days line. (The spec's `dailyGoal <= 0` / zero-day edge cases both collapse to this, since `budget = days × goal`.)

- [ ] **Step 1: Write the failing test**

Create `__tests__/ShopTallyStrip.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import ShopTallyStrip from '../src/components/ShopTallyStrip'

// Same style-flattening helper the BudgetBar suite uses.
function widthOf(node: any): string {
  const flat = Array.isArray(node.props.style)
    ? Object.assign({}, ...node.props.style)
    : node.props.style
  return flat.width
}

describe('ShopTallyStrip', () => {
  it('shows total (consumed + pending) over budget and the pending delta', () => {
    const { getByText } = render(
      <ShopTallyStrip consumedKcal={9000} pendingKcal={850} budgetKcal={14000} days={7} />
    )
    expect(getByText('9850 / 14000 kcal')).toBeTruthy()
    expect(getByText(/\+850 kcal/)).toBeTruthy()
  })

  it('renders consumed and pending bar segments at the right widths', () => {
    const { getByTestId } = render(
      <ShopTallyStrip consumedKcal={7000} pendingKcal={3500} budgetKcal={14000} days={7} />
    )
    expect(widthOf(getByTestId('shop-tally-fill'))).toBe('50%')
    expect(widthOf(getByTestId('shop-tally-pending-fill'))).toBe('25%')
  })

  it('caps the combined segments at 100% when over budget', () => {
    const { getByTestId } = render(
      <ShopTallyStrip consumedKcal={16000} pendingKcal={500} budgetKcal={14000} days={7} />
    )
    expect(widthOf(getByTestId('shop-tally-fill'))).toBe('100%')
    expect(widthOf(getByTestId('shop-tally-pending-fill'))).toBe('0%')
  })

  it('translates the fill into days of food, uncapped past the budget', () => {
    const under = render(
      <ShopTallyStrip consumedKcal={9850} pendingKcal={0} budgetKcal={14000} days={7} />
    )
    // 9850/14000 × 7 = 4.925 → 4.9
    expect(under.getByText('≈ 4.9 of 7 days of food')).toBeTruthy()

    const over = render(
      <ShopTallyStrip consumedKcal={16400} pendingKcal={0} budgetKcal={14000} days={7} />
    )
    // 16400/14000 × 7 = 8.2
    expect(over.getByText('≈ 8.2 of 7 days of food')).toBeTruthy()
  })

  it('renders only the kcal total when there is no budget to compare against', () => {
    const { getByText, queryByTestId } = render(
      <ShopTallyStrip consumedKcal={9000} pendingKcal={850} budgetKcal={0} days={0} />
    )
    expect(getByText('9850 kcal')).toBeTruthy()
    expect(queryByTestId('shop-tally-fill')).toBeNull()
    expect(queryByTestId('shop-tally-days')).toBeNull()
  })

  it('hides the pending delta when nothing is pending', () => {
    const { queryByText } = render(
      <ShopTallyStrip consumedKcal={9000} pendingKcal={0} budgetKcal={14000} days={7} />
    )
    expect(queryByText(/\+0 kcal/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/ShopTallyStrip.test.tsx`
Expected: FAIL — `Cannot find module '../src/components/ShopTallyStrip'`

- [ ] **Step 3: Write the component**

Create `src/components/ShopTallyStrip.tsx`:

```tsx
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'

type Props = {
  consumedKcal: number // active cycle: basket + pantry + extras
  pendingKcal: number // the item being configured in the sheet (per-unit kcal × qty)
  budgetKcal: number // cycleBudget(days, dailyGoal)
  days: number // cycle length
}

/** Shop-mode tally: how full the active cycle's budget is, shown between scans.
 *  Pure presentation — all kcal derivation happens in App.tsx with the same
 *  helpers the home BudgetBar uses, so the two surfaces can never disagree. */
export default function ShopTallyStrip({ consumedKcal, pendingKcal, budgetKcal, days }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.sageBg2, borderRadius: 14,
      paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
    },
    top: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    label: {
      fontFamily: fonts.display, fontSize: 12, fontWeight: '700',
      color: colors.moss,
    },
    kcal: {
      fontFamily: fonts.num, fontSize: 13, fontWeight: '600',
      color: colors.forest,
    },
    kcalOver: { color: colors.roseDeep },
    track: {
      height: 8, borderRadius: 4, backgroundColor: colors.sage100,
      overflow: 'hidden', flexDirection: 'row', marginTop: 7,
    },
    fill: { height: '100%', backgroundColor: colors.matcha },
    fillOver: { backgroundColor: colors.rose },
    pendingFill: { height: '100%', backgroundColor: colors.matchaSoft },
    days: {
      fontFamily: fonts.display, fontSize: 12, color: colors.moss,
      marginTop: 6,
    },
    daysOver: { color: colors.roseDeep },
  }), [colors])

  const total = consumedKcal + pendingKcal
  const [totalVal] = formatEnergy(total, units).split(' ')
  const label = pendingKcal > 0
    ? `In this batch  +${formatEnergy(pendingKcal, units)}`
    : 'In this batch'

  // Zero-length cycle / no daily goal: a fill fraction and "days of food" are
  // meaningless — show the running kcal total only.
  if (budgetKcal <= 0) {
    return (
      <View style={styles.card} testID="shop-tally">
        <View style={styles.top}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.kcal}>{formatEnergy(total, units)}</Text>
        </View>
      </View>
    )
  }

  const over = total > budgetKcal
  // Same stacked-segment scheme as BudgetBar: each segment claims only the
  // budget room left after the ones before it, so the bar caps at 100%.
  const consumedRatio = Math.min(consumedKcal, budgetKcal) / budgetKcal
  const afterConsumed = Math.max(0, budgetKcal - consumedKcal)
  const pendingRatio = Math.min(pendingKcal, afterConsumed) / budgetKcal
  const consumedPct: DimensionValue = `${Math.round(consumedRatio * 100)}%`
  const pendingPct: DimensionValue = `${Math.round(pendingRatio * 100)}%`
  const daysCovered = (total / budgetKcal) * days

  return (
    <View style={styles.card} testID="shop-tally">
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.kcal, over && styles.kcalOver]}>
          {`${totalVal} / ${formatEnergy(budgetKcal, units)}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, over && styles.fillOver, { width: consumedPct }]} testID="shop-tally-fill" />
        <View style={[styles.pendingFill, { width: pendingPct }]} testID="shop-tally-pending-fill" />
      </View>
      <Text style={[styles.days, over && styles.daysOver]} testID="shop-tally-days">
        {`≈ ${daysCovered.toFixed(1)} of ${days} days of food`}
      </Text>
    </View>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/ShopTallyStrip.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/components/ShopTallyStrip.tsx __tests__/ShopTallyStrip.test.tsx
git commit -m "feat: ShopTallyStrip — shop-mode cycle tally component"
```

---

### Task 2: Render the strip in `AddItemSheet` (scanned mode only)

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (props type ~line 22-37, destructure ~line 50, render just below the sheet header ~line 528)
- Test: `__tests__/AddItemSheet.test.tsx`

The sheet already knows the live pending kcal: `perUnitKcal` (derived ~line 450, and already 0 while the weight input is empty/invalid — this satisfies the spec's "invalid input → pending 0" rule) times `qty`. The strip renders only when `scanned && shopTally` — manual adds and receipt review never show it.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/AddItemSheet.test.tsx` (bottom of the file; it already defines `product` = Nutella, 400 g at 539 kcal/100g → per-unit 2156 kcal):

```tsx
describe('AddItemSheet — shop tally', () => {
  const tally = { consumedKcal: 1000, budgetKcal: 14000, days: 7 }

  it('shows the tally strip in scanned mode, including the pending item', () => {
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={product} scanned shopTally={tally} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('shop-tally')).toBeTruthy()
    // 1000 consumed + 2156 pending (Nutella 400 g @ 539/100g × qty 1)
    expect(getByText('3156 / 14000 kcal')).toBeTruthy()
  })

  it('updates the tally live as quantity changes', () => {
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={product} scanned shopTally={tally} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('qty-inc'))
    // 1000 + 2156 × 2
    expect(getByText('5312 / 14000 kcal')).toBeTruthy()
  })

  it('hides the strip for manual adds even when a tally is provided', () => {
    const { queryByTestId } = render(
      <AddItemSheet visible product={null} shopTally={tally} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('shop-tally')).toBeNull()
  })

  it('hides the strip in scanned mode when no tally is provided (no active cycle)', () => {
    const { queryByTestId } = render(
      <AddItemSheet visible product={product} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('shop-tally')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/AddItemSheet.test.tsx`
Expected: FAIL — the new suite errors on the unknown `shopTally` prop's missing render (`shop-tally` testID not found in the first two tests); pre-existing tests still PASS.

- [ ] **Step 3: Wire the strip into the sheet**

In `src/components/AddItemSheet.tsx`:

(a) Import, next to the other component imports:

```tsx
import ShopTallyStrip from './ShopTallyStrip'
```

(b) Add to `type Props`:

```tsx
  /** Shop-mode tally over the ACTIVE cycle; when set (and the sheet was opened
   *  by a scan) a live budget strip renders under the header. */
  shopTally?: { consumedKcal: number; budgetKcal: number; days: number }
```

(c) Add `shopTally` to the destructured props in the function signature:

```tsx
export default function AddItemSheet({ visible, product, onAdd, onClose, onScanBarcode, onScanReceipt, onScanForBarcode, customFoods = [], scanned = false, scanBarcode = null, keepScanning = false, onKeepScanning, basis, onBasisChange, shopTally }: Props) {
```

(d) Render the strip immediately after the sheet-header `<Text style={styles.sheetDesc}>…</Text>` block (before the manual-mode search bar):

```tsx
                  {/* ── SHOP TALLY (scanned mode, active cycle) — live budget fill incl. this item ── */}
                  {scanned && shopTally && (
                    <ShopTallyStrip
                      consumedKcal={shopTally.consumedKcal}
                      pendingKcal={perUnitKcal * qty}
                      budgetKcal={shopTally.budgetKcal}
                      days={shopTally.days}
                    />
                  )}
```

Note: `perUnitKcal` and `qty` are declared *below* the JSX-relevant derivations near line 450 — they are plain consts in the component body, so they are in scope in the JSX. No reordering needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/AddItemSheet.test.tsx`
Expected: PASS (all pre-existing tests plus the 4 new ones)

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: show shop tally strip in AddItemSheet scanned mode"
```

---

### Task 3: Derive the tally in `App.tsx` and pass it down

**Files:**
- Modify: `App.tsx` (derivation block near the existing `barMealPrep` block ~line 879-896; prop on the `<AddItemSheet …>` JSX ~line 1065-1080)
- Test: `__tests__/App.addToCycle.test.tsx`

**Critical detail:** the existing `barMealPrep/barPantry/barExtra` block computes over `viewedCycle` (what the user is *looking at*). Scanned items are added to `activeCycle` (`handleAddItems` maps over `activeCycleId`). The tally must be computed over **`activeCycle`** or the strip lies whenever the user browses a different period before scanning.

All helpers are already imported in `App.tsx` (`totalKcal`, `cycleBudget`, `extrasKcalInRange`, `pantryKcalForCycle` from `./src/utils/nutrition`; `daysBetween` from `./src/utils/dates`).

- [ ] **Step 1: Write the failing test**

Add to `__tests__/App.addToCycle.test.tsx` (inside the existing `describe('App scan -> add to active cycle', …)` block, reusing its mocks — the file already stubs `scanBarcodeWithCamera` to resolve a barcode and `lookupBarcode` to return Greek Yogurt, and pins the clock so seed `cycle-1` is active). Mirror the render/open steps of the existing `scanAndConfirmProduct` helper, but assert on the strip before confirming:

```tsx
  it('shows the shop tally strip while confirming a scanned item', async () => {
    const screen = render(<App />)
    await waitFor(() => expect(screen.getByTestId('add-fab')).toBeTruthy())

    fireEvent.press(screen.getByTestId('add-fab'))
    fireEvent.press(screen.getByTestId('fab-barcode'))
    await waitFor(() => expect(screen.getByTestId('add-item-sheet')).toBeTruthy())

    // Active cycle exists (seed cycle-1) → the tally strip renders in the sheet.
    expect(screen.getByTestId('shop-tally')).toBeTruthy()
  })
```

If the existing tests in this file use a different prelude to render + settle hydration (e.g. an extra `waitFor` or `act` around timers), copy that file's prevailing prelude exactly — the assertion lines above stay the same.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/App.addToCycle.test.tsx`
Expected: the new test FAILS (`shop-tally` not found — App passes no `shopTally` prop yet); existing tests PASS.

- [ ] **Step 3: Derive and pass the tally**

In `App.tsx`, directly after the `barMealPrep/…/barDays` derivation block (after the `} else if (activeExtraDate) { … }` closing around line 896), add:

```tsx
  // Shop tally for the Add-item sheet — computed over the ACTIVE cycle (the one
  // scans add into), not viewedCycle, which can be a different browsed period.
  // Same helpers as the home BudgetBar so the two surfaces always agree.
  let shopTally: { consumedKcal: number; budgetKcal: number; days: number } | undefined
  if (activeCycle) {
    const shopDays = daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    shopTally = {
      consumedKcal:
        totalKcal(activeCycle.items) +
        pantryKcalForCycle(livePantry, activeCycle, shopDays) +
        extrasKcalInRange(liveExtraMeals, activeCycle.startDate, activeCycle.endDate),
      budgetKcal: cycleBudget(shopDays, dailyGoal),
      days: shopDays,
    }
  }
```

Then add the prop to the `<AddItemSheet …>` JSX (~line 1065):

```tsx
          shopTally={shopTally}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/App.addToCycle.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add App.tsx __tests__/App.addToCycle.test.tsx
git commit -m "feat: wire shop tally from active cycle into AddItemSheet"
```

---

### Task 4: Full verification

**Files:** none new — verification only.

- [ ] **Step 1: Run the full suite**

```bash
npx tsc --noEmit
npm test
```

Expected: both green. If any *pre-existing* `AddItemSheet` or `App.*` test broke, the fix belongs in the feature code (most likely cause: the strip rendering where an old test's `getByText` now matches twice) — do not loosen old assertions to force a pass.

- [ ] **Step 2: On-device note**

Add one line to `TODO.md` under **📱 On-device verification**:

```markdown
- [ ] Shop tally strip — scan an item into the active batch, check the strip's numbers match the home budget bar, quantity stepper moves the bar live, over-budget flips to rose
```

(JS-only feature: hot-reloads via `npm start`, no native rebuild needed.)

- [ ] **Step 3: Commit**

```bash
git add TODO.md
git commit -m "docs: on-device check for shop tally strip"
```
