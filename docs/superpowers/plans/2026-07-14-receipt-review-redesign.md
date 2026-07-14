# Receipt Review Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ReceiptReviewSheet`'s crammed inline-editable row list with a read-only row list + a new stacked `ReceiptLineDetail` edit sheet, fixing the keyboard-blocking-content bug, the no-way-to-dismiss-the-keyboard bug, and the ambiguous "is this per 100g or total" calorie field — while adding macro editing for consistency with the rest of the app.

**Architecture:** `ReceiptReviewSheet` keeps its list/confirm role but rows become non-interactive except for a checkbox (include/exclude) and a tap target that opens `ReceiptLineDetail`, a new component modeled on `ItemDetail`'s visual language and `AddItemSheet`'s keyboard-handling (`KeyboardAvoidingView` + `DismissArea`). `ReceiptLineDetail` reuses the existing `NutritionFields` component for calories/macros editing with a per-100g/total toggle, starting in `'total'` basis since that's what the receipt scanner actually estimates.

**Tech Stack:** React Native, TypeScript, `@testing-library/react-native`, Jest.

**Spec:** `docs/superpowers/specs/2026-07-13-receipt-review-redesign-design.md`

---

### Task 1: `lineToFoodItem` forwards macros

**Files:**
- Modify: `src/utils/receipt.ts`
- Test: `__tests__/receipt.test.ts`

- [ ] **Step 1: Write the failing tests**

Add two new `it()` blocks to `__tests__/receipt.test.ts` (keep the existing one):

```ts
import { lineToFoodItem } from '../src/utils/receipt'

describe('lineToFoodItem', () => {
  it('maps a receipt line to a FoodItem tagged as receipt source', () => {
    const item = lineToFoodItem({
      id: 'r1',
      name: 'Chicken Thighs',
      weightG: 1000,
      kcal: 1770,
      isFood: true,
    })
    expect(item).toEqual({
      name: 'Chicken Thighs',
      weightG: 1000,
      kcal: 1770,
      emoji: '🛒',
      source: 'receipt',
    })
  })

  it('forwards macrosPer100g when provided', () => {
    const item = lineToFoodItem(
      { id: 'r1', name: 'Chicken Thighs', weightG: 1000, kcal: 1770, isFood: true },
      { protein: 22, carbs: 0, fat: 8 }
    )
    expect(item.macrosPer100g).toEqual({ protein: 22, carbs: 0, fat: 8 })
  })

  it('omits macrosPer100g when not provided', () => {
    const item = lineToFoodItem({ id: 'r1', name: 'Chicken Thighs', weightG: 1000, kcal: 1770, isFood: true })
    expect(item.macrosPer100g).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest __tests__/receipt.test.ts`
Expected: the first test PASSes (no change yet); "forwards macrosPer100g when provided" FAILs with `expected {"protein": 22, ...} but received undefined` (the function ignores the second argument since it isn't accepted yet).

- [ ] **Step 3: Implement**

Replace `src/utils/receipt.ts` with:

```ts
import { ReceiptLine, FoodItem, Macros } from '../types'

export function lineToFoodItem(line: ReceiptLine, macrosPer100g?: Macros): FoodItem {
  return {
    name: line.name,
    weightG: line.weightG,
    kcal: line.kcal,
    emoji: '🛒',
    source: 'receipt',
    macrosPer100g,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/receipt.test.ts`
Expected: PASS (all 3 tests). Note `toEqual` treats an `undefined`-valued key as absent, so the first test still passes with `macrosPer100g: undefined` present on the returned object.

- [ ] **Step 5: Commit**

```bash
git add src/utils/receipt.ts __tests__/receipt.test.ts
git commit -m "feat: forward macros from receipt lines to FoodItem"
```

---

### Task 2: `ReceiptLineDetail` component

**Files:**
- Create: `src/components/ReceiptLineDetail.tsx`
- Test: `__tests__/ReceiptLineDetail.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/ReceiptLineDetail.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ReceiptLineDetail from '../src/components/ReceiptLineDetail'

const LINE = { id: 'r2', name: 'Basmati Rice', weightG: 1000, kcalPer100g: 130, macrosPer100g: undefined }

function setup(overrides = {}) {
  const props = {
    visible: true,
    line: LINE,
    onSave: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<ReceiptLineDetail {...props} />) }
}

describe('ReceiptLineDetail', () => {
  it('pre-fills name, weight, and total calories from the draft line', () => {
    const { getByTestId } = setup()
    expect(getByTestId('rld-name').props.value).toBe('Basmati Rice')
    expect(getByTestId('rld-weight').props.value).toBe('1000')
    expect(getByTestId('nf-kcal').props.value).toBe('1300') // 130 kcal/100g over 1000g, basis=total
  })

  it('shows the macros section as estimated when the line has no macros', () => {
    const { getByText } = setup()
    expect(getByText('Macros · estimated')).toBeTruthy()
  })

  it('does not show the estimated hint once macros are present', () => {
    const { queryByText } = setup({ line: { ...LINE, macrosPer100g: { protein: 10, carbs: 20, fat: 5 } } })
    expect(queryByText('Macros · estimated')).toBeNull()
  })

  it('calls onSave with edited values and closes on Save', () => {
    const { props, getByTestId } = setup()
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('rld-weight'), '500')
    fireEvent.press(getByTestId('rld-save'))
    expect(props.onSave).toHaveBeenCalledWith('r2', {
      name: 'Jasmine Rice',
      weightG: 500,
      kcalPer100g: 130,
      macrosPer100g: undefined,
    })
    expect(props.onClose).toHaveBeenCalled()
  })

  it('calls onClose without onSave on Cancel', () => {
    const { props, getByTestId } = setup()
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.press(getByTestId('rld-cancel'))
    expect(props.onSave).not.toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalled()
  })

  it('renders nothing when line is null', () => {
    const { queryByTestId } = setup({ line: null })
    expect(queryByTestId('receipt-line-detail')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/ReceiptLineDetail.test.tsx`
Expected: FAIL with `Cannot find module '../src/components/ReceiptLineDetail'`.

- [ ] **Step 3: Implement**

Create `src/components/ReceiptLineDetail.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import DismissArea from './DismissArea'
import NutritionFields from './NutritionFields'
import { Macros, NutritionBasis } from '../types'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

export type ReceiptLineDraft = {
  id: string
  name: string
  weightG: number
  kcalPer100g: number | null
  macrosPer100g?: Macros
}

type Props = {
  visible: boolean
  line: ReceiptLineDraft | null
  onSave: (id: string, patch: { name: string; weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros }) => void
  onClose: () => void
}

export default function ReceiptLineDetail({ visible, line, onSave, onClose }: Props) {
  const colors = useColors()
  const [name, setName] = useState('')
  const [weightStr, setWeightStr] = useState('')
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>(undefined)
  const [basis, setBasis] = useState<NutritionBasis>('total')

  useEffect(() => {
    if (line) {
      setName(line.name)
      setWeightStr(String(line.weightG))
      setKcalPer100g(line.kcalPer100g)
      setMacrosPer100g(line.macrosPer100g)
      setBasis('total')
    }
  }, [line, visible])

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      paddingTop: 22, paddingHorizontal: 22, paddingBottom: 30,
      maxHeight: '90%',
    },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    label: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginBottom: 6 },
    nameInput: {
      fontFamily: fonts.head, fontSize: 19, color: colors.forest,
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.sageBg2,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
    },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
    fieldL: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.num, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 80, padding: 0 },
    nutritionCard: { backgroundColor: colors.sageBg2, borderRadius: 16, padding: 14, marginBottom: 16 },
    seclbl: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginBottom: 10 },
    row: { flexDirection: 'row', gap: 9 },
    btn: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: colors.forest },
    btnTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
    ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line, flex: 0, width: 100 },
    ghostTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.moss },
  }), [colors])

  if (!line) return null

  const weightNum = parseFloat(weightStr) || 0
  const isEstimated = macrosPer100g == null

  function handleSave() {
    onSave(line.id, {
      name: name.trim() || line.name,
      weightG: weightNum,
      kcalPer100g,
      macrosPer100g,
    })
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="receipt-line-detail">
              <View style={styles.grab} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  testID="rld-name"
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                />

                <View style={styles.field}>
                  <Text style={styles.fieldL}>Weight (g)</Text>
                  <TextInput
                    testID="rld-weight"
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={weightStr}
                    onChangeText={setWeightStr}
                    selectTextOnFocus
                  />
                </View>

                <View style={styles.nutritionCard}>
                  <Text style={styles.seclbl}>Macros{isEstimated ? ' · estimated' : ''}</Text>
                  <NutritionFields
                    basis={basis}
                    onBasisChange={setBasis}
                    G={weightNum}
                    kcalPer100g={kcalPer100g}
                    macrosPer100g={macrosPer100g}
                    onChange={({ kcalPer100g, macrosPer100g }) => { setKcalPer100g(kcalPer100g); setMacrosPer100g(macrosPer100g) }}
                    editable
                  />
                </View>

                <View style={styles.row}>
                  <TouchableOpacity testID="rld-cancel" style={[styles.btn, styles.ghost]} onPress={onClose}>
                    <Text style={styles.ghostTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="rld-save" style={styles.btn} onPress={handleSave}>
                    <Text style={styles.btnTxt}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>
    </Modal>
  )
}
```

Note: the "Macros" section label already carries the per-100g/total distinction via `NutritionFields`' own unit suffix (`kcal / 100g` vs `kcal per pack`) next to each field — no separate "Total calories for this item" label is needed on top of that; it would duplicate what the segmented control + unit suffix already say.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/ReceiptLineDetail.test.tsx`
Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ReceiptLineDetail.tsx __tests__/ReceiptLineDetail.test.tsx
git commit -m "feat: add ReceiptLineDetail per-item edit sheet"
```

---

### Task 3: Wire `ReceiptLineDetail` into `ReceiptReviewSheet`, make rows read-only

**Files:**
- Modify: `src/components/ReceiptReviewSheet.tsx`
- Test: `__tests__/ReceiptReviewSheet.test.tsx`

- [ ] **Step 1: Rewrite the test file for the new read-only-row + detail-sheet flow**

Replace `__tests__/ReceiptReviewSheet.test.tsx` with:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ReceiptReviewSheet from '../src/components/ReceiptReviewSheet'
import { getMockReceiptLines } from '../src/mockReceipts'

function setup(overrides = {}) {
  const props = {
    visible: true,
    lines: getMockReceiptLines(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<ReceiptReviewSheet {...props} />) }
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

  it('opens the detail sheet pre-filled when a row is tapped', () => {
    const { getByTestId } = setup()
    fireEvent.press(getByTestId('open-r2')) // Basmati Rice, 1000g, 1300 kcal
    expect(getByTestId('rld-name').props.value).toBe('Basmati Rice')
    expect(getByTestId('rld-weight').props.value).toBe('1000')
    expect(getByTestId('nf-kcal').props.value).toBe('1300')
  })

  it('uses edited name/weight/kcal values in the confirmed item', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r2'))
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('rld-weight'), '500')
    fireEvent.changeText(getByTestId('nf-kcal'), '700')
    fireEvent.press(getByTestId('rld-save'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 500, kcal: 700, source: 'receipt' })
  })

  // Regression: parseInt truncated decimal weight/kcal input (e.g. "127.5" -> 127),
  // same bug class fixed elsewhere on 2026-07-01. Use parseFloat (kcal rounded).
  it('does not truncate decimal weight/kcal input', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r2'))
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('rld-weight'), '127.5')
    fireEvent.changeText(getByTestId('nf-kcal'), '164.6')
    fireEvent.press(getByTestId('rld-save'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 127.5, kcal: 165 })
  })

  it('propagates edited macros through to the confirmed item', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r1')) // Chicken Thighs, 1000g, 1770 kcal
    fireEvent.changeText(getByTestId('nf-protein'), '220')
    fireEvent.changeText(getByTestId('nf-carbs'), '0')
    fireEvent.changeText(getByTestId('nf-fat'), '80')
    fireEvent.press(getByTestId('rld-save'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const chicken = items.find((i: any) => i.name === 'Chicken Thighs')
    expect(chicken.macrosPer100g).toEqual({ protein: 22, carbs: 0, fat: 8 })
  })

  it('discards edits when the detail sheet is cancelled', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r1'))
    fireEvent.changeText(getByTestId('rld-name'), 'Something Else')
    fireEvent.press(getByTestId('rld-cancel'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeDefined()
    expect(items.find((i: any) => i.name === 'Something Else')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/ReceiptReviewSheet.test.tsx`
Expected: FAIL — "renders rows as read-only" fails because `name-r1`/`weight-r1`/`kcal-r1` still exist; "opens the detail sheet pre-filled" and everything after it fails with `Unable to find an element with testID: open-r2` (doesn't exist yet).

- [ ] **Step 3: Implement**

Replace `src/components/ReceiptReviewSheet.tsx` with:

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
import { ReceiptLine, FoodItem, Macros } from '../types'
import { lineToFoodItem } from '../utils/receipt'
import { kcalForWeight, roundTenth } from '../utils/nutrition'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import ReceiptLineDetail, { ReceiptLineDraft } from './ReceiptLineDetail'

type Props = {
  visible: boolean
  lines: ReceiptLine[]
  onConfirm: (items: FoodItem[]) => void
  onClose: () => void
}

type Row = {
  id: string
  name: string
  weightG: number
  kcal: number
  kcalPer100g: number | null
  macrosPer100g?: Macros
  included: boolean
}

function toRows(lines: ReceiptLine[]): Row[] {
  return lines.map((l) => ({
    id: l.id,
    name: l.name,
    weightG: l.weightG,
    kcal: l.kcal,
    kcalPer100g: l.weightG > 0 ? roundTenth((l.kcal / l.weightG) * 100) : null,
    included: l.isFood,
  }))
}

export default function ReceiptReviewSheet({ visible, lines, onConfirm, onClose }: Props) {
  const colors = useColors()
  const [rows, setRows] = useState<Row[]>(() => toRows(lines))
  const [detailId, setDetailId] = useState<string | null>(null)

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
  }, [lines, visible])

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function handleSaveDetail(id: string, patch: { name: string; weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros }) {
    update(id, {
      name: patch.name,
      weightG: patch.weightG,
      kcalPer100g: patch.kcalPer100g,
      macrosPer100g: patch.macrosPer100g,
      kcal: kcalForWeight(patch.kcalPer100g ?? 0, patch.weightG),
    })
  }

  function handleConfirm() {
    const items = rows
      .filter((r) => r.included)
      .map((r) =>
        lineToFoodItem(
          { id: r.id, name: r.name.trim() || 'Item', weightG: r.weightG, kcal: r.kcal, isFood: true },
          r.macrosPer100g
        )
      )
    onConfirm(items)
    onClose()
  }

  const includedCount = rows.filter((r) => r.included).length
  const detailRow = rows.find((r) => r.id === detailId) ?? null
  const detailDraft: ReceiptLineDraft | null = detailRow
    ? { id: detailRow.id, name: detailRow.name, weightG: detailRow.weightG, kcalPer100g: detailRow.kcalPer100g, macrosPer100g: detailRow.macrosPer100g }
    : null

  return (
    <>
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
                    <Text style={styles.meta}>{r.weightG.toLocaleString()} g · {r.kcal.toLocaleString()} kcal</Text>
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
      </Modal>

      <ReceiptLineDetail
        visible={detailId != null}
        line={detailDraft}
        onSave={handleSaveDetail}
        onClose={() => setDetailId(null)}
      />
    </>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/ReceiptReviewSheet.test.tsx`
Expected: PASS (all 10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ReceiptReviewSheet.tsx __tests__/ReceiptReviewSheet.test.tsx
git commit -m "refactor: make receipt review rows read-only, edit via ReceiptLineDetail"
```

---

### Task 4: Full-suite check and manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS, no regressions in unrelated suites — in particular `__tests__/AddFab.test.tsx` and `__tests__/NewPeriodPanel.test.tsx`, the only other suites that reference `ReceiptReviewSheet`, should be unaffected since its `visible`/`lines`/`onConfirm`/`onClose` props didn't change.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `src/components/ReceiptReviewSheet.tsx`, `src/components/ReceiptLineDetail.tsx`, or `src/utils/receipt.ts`.

- [ ] **Step 3: Manual verification (not unit-testable — keyboard/layout behavior needs a real device/simulator)**

Use the `/run` (or equivalent) skill to launch the app, then:
1. Open **Scan Receipt**, get to the review list. Confirm each row shows name + "weight · kcal" only, no visible text inputs, and tapping a row (not the checkbox) opens the detail sheet.
2. In the detail sheet, tap into the Weight field — confirm the numeric keypad appears, and tapping anywhere outside a field dismisses it (the "can't dismiss the number pad" bug).
3. Scroll the review list so the last row is near the bottom, open its detail sheet, tap into a field near the bottom of the sheet (e.g. Fat) — confirm the field stays visible above the keyboard rather than being covered (the keyboard-blocks-content bug).
4. Edit a value, tap Save, confirm the row's meta line reflects the edit. Open it again, edit something, tap Cancel, confirm the row is unchanged.
5. Confirm the receipt and check the added item shows correct weight/kcal in the batch list.

- [ ] **Step 4: Report results**

If manual verification finds any issue, fix it in the relevant file from Task 2 or 3 and re-run the affected Jest suite before considering the plan complete. If all checks pass, the plan is done.
