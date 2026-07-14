# Receipt-Line Edit: Reuse ItemDetail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled `ReceiptLineDetail` sheet (merged in PR #1) with direct reuse of the existing, polished `ItemDetail` component, deleting ~200 lines of duplicated sheet chrome, field styles, and tests.

**Architecture:** `ReceiptReviewSheet` keeps its read-only row list, but tapping a row now opens the existing `ItemDetail` (kind `'item'`) with a synthetic draft `FoodItem` built from the row. Saving maps `ItemDetail`'s patch back into the row; "Remove from basket" unchecks the row. `ItemDetail` itself is unchanged except one added `testID`. `ReceiptLineDetail.tsx` is deleted.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript, Jest + @testing-library/react-native.

---

## Why this change (context for the implementer)

The receipt-review redesign (PR #1, spec at `docs/superpowers/specs/2026-07-13-receipt-review-redesign-design.md`) created a new `ReceiptLineDetail` component that duplicates `ItemDetail`'s modal scaffolding, backdrop, grab handle, field rows, and Save/Cancel footer, and misses `ItemDetail` polish (slide-in spring animation, header with emoji/name/kcal, the hardcoded `paddingBottom: 50` home-indicator clearance from AGENTS.md). The user has decided reuse beats a parallel implementation.

Reusing `ItemDetail` with `kind="item"` **as-is** requires zero new branching inside `ItemDetail` (which is what the original spec was worried about). Known, accepted deviations from the 2026-07-13 spec:

- **View-first**: tapping a row shows the item summary; the user taps Edit to change values (same as every other item in the app). The spec wanted edit-immediately.
- **Quantity is now editable** on a receipt draft (the spec said no quantity). This is a feature: receipts often have "2 ×" lines. `lineToFoodItem` forwards it.
- **"Remove from basket"** (with `ItemDetail`'s built-in confirm) is wired to *uncheck* the row, not delete anything. The row stays visible in the list, so it is recoverable.
- **Basis still opens as `'total'`** — `ReceiptReviewSheet` owns a local `basis` state initialized to `'total'` and passes it to `ItemDetail`.

**Nested-modal constraint (critical):** `ItemDetail` renders its own `<Modal>`. It MUST be rendered *inside* the review sheet's `<Modal>` children, never as a sibling outside it. Two sibling modals visible at once is the iOS "black screen / already presenting" failure mode previously fixed in commit `0151b79`. (The code being replaced renders `ReceiptLineDetail` as a sibling — do not copy that.)

**Non-negotiable invariants (AGENTS.md):** nothing here syncs — receipt rows are local drafts until confirmed; `handleAddItems` in `App.tsx` already handles persistence/`markDirty`. `FoodItem.weightG`/`.kcal` stay per-unit with `quantity` as a separate multiplier — `ItemDetail`'s `saveItem` already produces exactly that shape.

## File structure

- Modify: `src/utils/receipt.ts` — `lineToFoodItem` gains an optional `quantity` param.
- Modify: `__tests__/receipt.test.ts` — new quantity tests.
- Modify: `src/components/ItemDetail.tsx` — one added `testID` on the edit-mode Cancel button (needed because the review sheet also has a "Cancel" text, making `getByText('Cancel')` ambiguous in tests).
- Rewrite: `src/components/ReceiptReviewSheet.tsx` — swap `ReceiptLineDetail` for `ItemDetail`; `Row` drops `kcalPer100g`, gains `quantity`.
- Modify: `App.tsx` — pass `days={activeDayCount}` to `ReceiptReviewSheet` (~line 1120).
- Rewrite: `__tests__/ReceiptReviewSheet.test.tsx` — drive `ItemDetail`'s testIDs instead of `rld-*`.
- Delete: `src/components/ReceiptLineDetail.tsx`, `__tests__/ReceiptLineDetail.test.tsx`.

Baseline before starting: `npx tsc --noEmit` clean and `npm test` green (70 suites / 503 tests as of merge commit `b6ec65a`).

---

### Task 1: `lineToFoodItem` forwards quantity

**Files:**
- Modify: `src/utils/receipt.ts`
- Test: `__tests__/receipt.test.ts`

- [x] **Step 1: Add failing tests**

Append inside the existing `describe('lineToFoodItem', ...)` block in `__tests__/receipt.test.ts`:

```ts
  it('forwards quantity when greater than 1', () => {
    const item = lineToFoodItem(
      { id: 'r1', name: 'Yogurt', weightG: 150, kcal: 90, isFood: true },
      undefined,
      2
    )
    expect(item.quantity).toBe(2)
  })

  it('omits quantity when 1 or not provided', () => {
    const one = lineToFoodItem({ id: 'r1', name: 'Yogurt', weightG: 150, kcal: 90, isFood: true }, undefined, 1)
    const none = lineToFoodItem({ id: 'r1', name: 'Yogurt', weightG: 150, kcal: 90, isFood: true })
    expect(one.quantity).toBeUndefined()
    expect(none.quantity).toBeUndefined()
  })
```

- [x] **Step 2: Run to verify failure**

Run: `npx jest __tests__/receipt.test.ts`
Expected: FAIL — "Expected: 2, Received: undefined" (extra args are ignored by the current 2-param signature).

- [x] **Step 3: Implement**

Replace the function in `src/utils/receipt.ts` with:

```ts
import { ReceiptLine, FoodItem, Macros } from '../types'

export function lineToFoodItem(line: ReceiptLine, macrosPer100g?: Macros, quantity?: number): FoodItem {
  return {
    name: line.name,
    weightG: line.weightG,
    kcal: line.kcal,
    emoji: '🛒',
    source: 'receipt',
    macrosPer100g,
    // quantity is a separate multiplier on FoodItem; only carry it when meaningful
    ...(quantity != null && quantity > 1 ? { quantity } : {}),
  }
}
```

- [x] **Step 4: Run to verify pass**

Run: `npx jest __tests__/receipt.test.ts`
Expected: PASS (all 5 tests).

- [x] **Step 5: Commit**

```bash
git add src/utils/receipt.ts __tests__/receipt.test.ts
git commit -m "feat: lineToFoodItem forwards quantity multiplier"
```

---

### Task 2: ReceiptReviewSheet opens ItemDetail instead of ReceiptLineDetail

**Files:**
- Modify: `src/components/ItemDetail.tsx` (one testID)
- Rewrite: `src/components/ReceiptReviewSheet.tsx`
- Modify: `App.tsx` (~line 1120)
- Test: `__tests__/ReceiptReviewSheet.test.tsx` (rewrite)

- [x] **Step 1: Add a testID to ItemDetail's edit-mode Cancel button**

In `src/components/ItemDetail.tsx` (~line 305), the edit footer currently reads:

```tsx
<TouchableOpacity style={[styles.btn, styles.ghost, { flex: 0, width: 100 }]} onPress={() => setEditing(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
```

Change only by adding a testID (no other changes to this file):

```tsx
<TouchableOpacity testID="id-cancel-edit" style={[styles.btn, styles.ghost, { flex: 0, width: 100 }]} onPress={() => setEditing(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
```

- [x] **Step 2: Rewrite the test file**

Replace the full contents of `__tests__/ReceiptReviewSheet.test.tsx` with:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ReceiptReviewSheet from '../src/components/ReceiptReviewSheet'
import { getMockReceiptLines } from '../src/mockReceipts'

function setup(overrides = {}) {
  const props = {
    visible: true,
    lines: getMockReceiptLines(),
    days: 7,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<ReceiptReviewSheet {...props} />) }
}

// Rows open the shared ItemDetail in view mode; Edit reveals the editable fields.
function openAndEdit(utils: ReturnType<typeof setup>, id: string) {
  fireEvent.press(utils.getByTestId(`open-${id}`))
  fireEvent.press(utils.getByText('Edit'))
}

describe('ReceiptReviewSheet', () => {
  it('renders a row per line', () => {
    const { getAllByTestId } = setup()
    expect(getAllByTestId(/^receipt-row-/).length).toBe(getMockReceiptLines().length)
  })

  it('renders rows as read-only (no inline text inputs)', () => {
    const { queryByTestId } = setup()
    expect(queryByTestId('name-r1')).toBeNull()
    expect(queryByTestId('weight-r1')).toBeNull()
    expect(queryByTestId('kcal-r1')).toBeNull()
  })

  it('confirms only food lines by default (non-food excluded) as receipt-sourced items', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(4) // 4 food, TOTAL excluded
    expect(items.every((i: any) => i.source === 'receipt')).toBe(true)
    expect(items.find((i: any) => i.name === 'TOTAL £14.20')).toBeUndefined()
    expect(props.onClose).toHaveBeenCalled()
  })

  it('excludes a food line when its toggle is turned off', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('toggle-r1')) // turn off Chicken Thighs
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(3)
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeUndefined()
  })

  it('includes a non-food line when its toggle is turned on', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('toggle-r5')) // turn on TOTAL line
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(5)
  })

  it('opens ItemDetail pre-filled when a row is tapped (total-basis kcal)', () => {
    const utils = setup()
    openAndEdit(utils, 'r2') // Basmati Rice, 1000g, 1300 kcal
    expect(utils.getByTestId('id-name').props.value).toBe('Basmati Rice')
    expect(utils.getByTestId('id-weight').props.value).toBe('1000')
    // basis starts at 'total': 130 kcal/100g over 1000g shows as 1300
    expect(utils.getByTestId('nf-kcal').props.value).toBe('1300')
  })

  it('uses edited name/weight/kcal values in the confirmed item', () => {
    const utils = setup()
    openAndEdit(utils, 'r2')
    fireEvent.changeText(utils.getByTestId('id-name'), 'Jasmine Rice')
    fireEvent.changeText(utils.getByTestId('id-weight'), '500')
    fireEvent.changeText(utils.getByTestId('nf-kcal'), '700')
    fireEvent.press(utils.getByText('Save'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 500, kcal: 700, source: 'receipt' })
  })

  // Regression guard from 2026-07-01: decimal input must not be *truncated*.
  // ItemDetail rounds weight to whole grams on save (127.5 -> 128, not 127),
  // and kcal comes back via kcalForWeight (129.1/100g over 128g -> 165).
  it('does not truncate decimal weight/kcal input', () => {
    const utils = setup()
    openAndEdit(utils, 'r2')
    fireEvent.changeText(utils.getByTestId('id-name'), 'Jasmine Rice')
    fireEvent.changeText(utils.getByTestId('id-weight'), '127.5')
    fireEvent.changeText(utils.getByTestId('nf-kcal'), '164.6')
    fireEvent.press(utils.getByText('Save'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 128, kcal: 165 })
  })

  it('propagates edited macros through to the confirmed item', () => {
    const utils = setup()
    openAndEdit(utils, 'r1') // Chicken Thighs, 1000g, 1770 kcal
    fireEvent.changeText(utils.getByTestId('nf-protein'), '220')
    fireEvent.changeText(utils.getByTestId('nf-carbs'), '0')
    fireEvent.changeText(utils.getByTestId('nf-fat'), '80')
    fireEvent.press(utils.getByText('Save'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const chicken = items.find((i: any) => i.name === 'Chicken Thighs')
    expect(chicken.macrosPer100g).toEqual({ protein: 22, carbs: 0, fat: 8 })
  })

  it('carries an edited quantity into the confirmed item and the row meta', () => {
    const utils = setup()
    openAndEdit(utils, 'r3') // Spinach, 200g, 46 kcal
    fireEvent.press(utils.getByTestId('id-qty-inc'))
    fireEvent.press(utils.getByText('Save'))
    expect(utils.getByText('2 × 200 g · 92 kcal')).toBeTruthy()
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const spinach = items.find((i: any) => i.name === 'Spinach')
    expect(spinach).toMatchObject({ weightG: 200, kcal: 46, quantity: 2 })
  })

  it('discards edits when editing is cancelled', () => {
    const utils = setup()
    openAndEdit(utils, 'r1')
    fireEvent.changeText(utils.getByTestId('id-name'), 'Something Else')
    fireEvent.press(utils.getByTestId('id-cancel-edit'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeDefined()
    expect(items.find((i: any) => i.name === 'Something Else')).toBeUndefined()
  })

  it('unchecks the row when Remove from basket is confirmed', () => {
    const utils = setup()
    fireEvent.press(utils.getByTestId('open-r1'))
    fireEvent.press(utils.getByText('Remove from basket'))
    fireEvent.press(utils.getByText('Delete')) // ItemDetail's built-in confirm
    expect(utils.getByTestId('receipt-row-r1')).toBeTruthy() // row stays, just excluded
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(3)
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeUndefined()
  })
})
```

- [x] **Step 3: Run to verify failure**

Run: `npx jest __tests__/ReceiptReviewSheet.test.tsx`
Expected: FAIL — `getByText('Edit')` not found (the component still renders `ReceiptLineDetail`, which has no view mode), quantity/remove tests fail.

- [x] **Step 4: Rewrite the component**

Replace the full contents of `src/components/ReceiptReviewSheet.tsx` with:

```tsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { ReceiptLine, FoodItem, Macros, NutritionBasis } from '../types'
import { lineToFoodItem } from '../utils/receipt'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import ItemDetail from './ItemDetail'

type Props = {
  visible: boolean
  lines: ReceiptLine[]
  days: number
  onConfirm: (items: FoodItem[]) => void
  onClose: () => void
}

// weightG/kcal are per-unit with quantity as a separate multiplier, mirroring FoodItem,
// so a row maps 1:1 onto the draft item handed to ItemDetail.
type Row = {
  id: string
  name: string
  weightG: number
  kcal: number
  quantity: number
  macrosPer100g?: Macros
  included: boolean
}

function toRows(lines: ReceiptLine[]): Row[] {
  return lines.map((l) => ({
    id: l.id,
    name: l.name,
    weightG: l.weightG,
    kcal: l.kcal,
    quantity: 1,
    included: l.isFood,
  }))
}

export default function ReceiptReviewSheet({ visible, lines, days, onConfirm, onClose }: Props) {
  const colors = useColors()
  const [rows, setRows] = useState<Row[]>(() => toRows(lines))
  const [detailId, setDetailId] = useState<string | null>(null)
  // Receipt lines carry total kcal for the line's weight, so the detail sheet opens in
  // 'total' basis (the number the scanner actually produced).
  const [basis, setBasis] = useState<NutritionBasis>('total')

  const styles = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, marginBottom: 12 },
    list: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.itemCard,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      shadowColor: colors.kcalText,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    check: {
      width: 26,
      height: 26,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cycleBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkOn: { backgroundColor: colors.cycleBar, borderColor: colors.cycleBar },
    checkMark: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    fields: { flex: 1 },
    name: { fontFamily: fonts.bodySemi, fontSize: 15, fontWeight: '600', color: colors.kcalText },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.monthText, marginTop: 2 },
    addBtn: {
      backgroundColor: colors.selectedDay,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
    cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    cancelText: { color: colors.monthText, fontSize: 15 },
  }), [colors])

  useEffect(() => {
    setRows(toRows(lines))
    setDetailId(null)
  }, [lines, visible])

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  // ItemDetail's saveItem always sets name/weightG/kcal/quantity/macrosPer100g on the patch;
  // an undefined macrosPer100g means the user cleared the macros, so it's applied as-is.
  function handleSaveDetail(patch: Partial<FoodItem>) {
    if (detailId == null) return
    update(detailId, {
      ...(patch.name != null ? { name: patch.name } : {}),
      ...(patch.weightG != null ? { weightG: patch.weightG } : {}),
      ...(patch.kcal != null ? { kcal: patch.kcal } : {}),
      ...(patch.quantity != null ? { quantity: patch.quantity } : {}),
      macrosPer100g: patch.macrosPer100g,
    })
  }

  function handleRemoveDetail() {
    if (detailId != null) update(detailId, { included: false })
    setDetailId(null)
  }

  function handleConfirm() {
    const items = rows
      .filter((r) => r.included)
      .map((r) =>
        lineToFoodItem(
          { id: r.id, name: r.name.trim() || 'Item', weightG: r.weightG, kcal: r.kcal, isFood: true },
          r.macrosPer100g,
          r.quantity
        )
      )
    onConfirm(items)
    onClose()
  }

  const includedCount = rows.filter((r) => r.included).length
  const detailRow = rows.find((r) => r.id === detailId) ?? null
  const detailItem: FoodItem | null = detailRow
    ? {
        name: detailRow.name,
        weightG: detailRow.weightG,
        kcal: detailRow.kcal,
        emoji: '🛒',
        quantity: detailRow.quantity,
        source: 'receipt',
        macrosPer100g: detailRow.macrosPer100g,
      }
    : null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="receipt-review-sheet">
          <Text style={styles.title}>Review receipt</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {rows.map((r) => (
              <View key={r.id} testID={`receipt-row-${r.id}`} style={styles.row}>
                <TouchableOpacity
                  testID={`toggle-${r.id}`}
                  style={[styles.check, r.included && styles.checkOn]}
                  onPress={() => update(r.id, { included: !r.included })}
                >
                  <Text style={styles.checkMark}>{r.included ? '✓' : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`open-${r.id}`}
                  style={styles.fields}
                  onPress={() => setDetailId(r.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.meta}>
                    {r.quantity > 1 ? `${r.quantity} × ` : ''}{r.weightG.toLocaleString()} g · {(r.kcal * r.quantity).toLocaleString()} kcal
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity testID="confirm-receipt" style={styles.addBtn} onPress={handleConfirm}>
            <Text style={styles.addBtnText}>
              Add {includedCount} item{includedCount === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity testID="cancel-receipt" style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inside this Modal on purpose: a sibling Modal visible at the same time is the
          iOS "already presenting" black-screen bug (see commit 0151b79). */}
      {detailItem && (
        <ItemDetail
          visible
          kind="item"
          item={detailItem}
          days={days}
          basis={basis}
          onBasisChange={setBasis}
          onSaveItem={handleSaveDetail}
          onRemove={handleRemoveDetail}
          onClose={() => setDetailId(null)}
        />
      )}
    </Modal>
  )
}
```

- [x] **Step 5: Pass `days` from App**

In `App.tsx` (~line 1120), add the `days` prop:

```tsx
        <ReceiptReviewSheet
          visible={reviewVisible}
          lines={reviewLines}
          days={activeDayCount}
          onConfirm={handleConfirmReceipt}
          onClose={() => setReviewVisible(false)}
        />
```

- [x] **Step 6: Run to verify pass**

Run: `npx jest __tests__/ReceiptReviewSheet.test.tsx __tests__/ItemDetail.test.tsx`
Expected: PASS (all tests in both files).

Run: `npx tsc --noEmit`
Expected: no errors. (If `ReceiptLineDetail` import errors appear anywhere, that file is deleted in Task 3 — but nothing except `ReceiptReviewSheet` imported it, and that import is gone now.)

- [x] **Step 7: Commit**

```bash
git add src/components/ReceiptReviewSheet.tsx src/components/ItemDetail.tsx App.tsx __tests__/ReceiptReviewSheet.test.tsx
git commit -m "refactor: reuse ItemDetail for receipt-line editing"
```

---

### Task 3: Delete ReceiptLineDetail and verify the whole suite

**Files:**
- Delete: `src/components/ReceiptLineDetail.tsx`
- Delete: `__tests__/ReceiptLineDetail.test.tsx`

- [ ] **Step 1: Check nothing still references it**

Run: `grep -rn "ReceiptLineDetail" src App.tsx __tests__ docs/superpowers/plans/2026-07-14-receipt-line-edit-reuse-itemdetail.md --include='*.ts' --include='*.tsx'`
Expected: matches only in `src/components/ReceiptLineDetail.tsx` and `__tests__/ReceiptLineDetail.test.tsx` themselves. (References in docs/plans are fine — leave them.)

- [ ] **Step 2: Delete**

```bash
git rm src/components/ReceiptLineDetail.tsx __tests__/ReceiptLineDetail.test.tsx
```

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit && npm test`
Expected: tsc clean; all suites pass (69 suites — one fewer than baseline since `ReceiptLineDetail.test.tsx` is gone; test count ≥ 505).

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: delete ReceiptLineDetail, superseded by ItemDetail reuse"
```

---

## Manual on-device verification (post-merge, cannot be unit tested)

Jest/RNTL can't exercise native modal presentation or the keyboard. On a device/simulator (`npx expo run:ios` or the dev client), scan a receipt and check:
1. Tapping a row presents `ItemDetail` **on top of** the review sheet (no black screen, no silently-missing sheet — the nested-modal case).
2. Editing the last row of a long receipt: the focused field stays visible above the keyboard (ItemDetail's `KeyboardAvoidingView`).
3. Tapping the dimmed area above the detail sheet closes it and returns to the intact list.
