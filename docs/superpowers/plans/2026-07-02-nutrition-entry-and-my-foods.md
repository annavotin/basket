# Nutrition Entry & "My Foods" Round-Trip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enter/show calories + macros in a clear, toggleable per-100g-or-total basis; show total quantity in the detail view; make searched macros editable; and give one visible "Save to My Foods" control with barcode linking.

**Architecture:** Nutrition is always stored canonically (`kcalPer100g` + `macrosPer100g`). A basis toggle is a pure view/entry convenience, converting via two tested helpers. A single shared `NutritionFields` component is reused by the add sheet and the detail sheet so they can't diverge. "My Foods" save becomes one explicit toggle (default on) replacing the silent auto-save.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Jest + @testing-library/react-native. Spec: `docs/superpowers/specs/2026-07-02-nutrition-entry-and-my-foods-design.md`.

**Scope:** Phases 1 & 2 (client-only). Phase 3 (label OCR) is a separate plan — it needs a backend deploy + the pending `expo-image-manipulator` native rebuild.

**Conventions:** run `npx jest <file>` for a single suite; keep `npx tsc --noEmit` green. Fonts via `src/styles/fonts.ts`, colors via `useColors()`. No em dashes in user-facing strings.

---

## Phase 1 — Core model, total quantity, editable nutrition

### Task 1: Add the `nutritionBasis` preference

**Files:**
- Modify: `src/types.ts` (add `NutritionBasis` type + `Preferences.nutritionBasis`)
- Modify: `src/data.ts:5-12` (`DEFAULT_PREFERENCES`)
- Test: `__tests__/storage.test.ts`

- [ ] **Step 1: Write the failing test** — add to `__tests__/storage.test.ts`:

```ts
import { loadPrefs } from '../src/services/storage'
import { DEFAULT_PREFERENCES } from '../src/data'
import AsyncStorage from '@react-native-async-storage/async-storage'

describe('nutritionBasis preference', () => {
  it('defaults to per100g', () => {
    expect(DEFAULT_PREFERENCES.nutritionBasis).toBe('per100g')
  })

  it('back-fills the default when an older prefs blob lacks it', async () => {
    await AsyncStorage.setItem('basket:prefs:v1', JSON.stringify({ name: 'X', defaultDays: 4 }))
    const p = await loadPrefs()
    expect(p.nutritionBasis).toBe('per100g')
  })
})
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx jest __tests__/storage.test.ts -t nutritionBasis`
Expected: FAIL (`nutritionBasis` is `undefined`).

- [ ] **Step 3: Implement** — in `src/types.ts`, add the type and field:

```ts
export type NutritionBasis = 'per100g' | 'total'
```
and inside `Preferences`:
```ts
  nutritionBasis: NutritionBasis
```
In `src/data.ts`, add to `DEFAULT_PREFERENCES` (after `macroTargets`):
```ts
  nutritionBasis: 'per100g',
```
(No `loadPrefs` change needed — it already spreads `{ ...DEFAULT_PREFERENCES, ...p }`.)

- [ ] **Step 4: Run it, expect pass**

Run: `npx jest __tests__/storage.test.ts -t nutritionBasis` → PASS. Then `npx tsc --noEmit` → clean (fixing any `Preferences` literal that now needs the field; grep `DEFAULT_PREFERENCES` and test fixtures).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/data.ts __tests__/storage.test.ts
git commit -m "feat: add nutritionBasis preference (per100g default)"
```

---

### Task 2: `toBasis` / `fromBasis` conversion helpers

**Files:**
- Modify: `src/utils/nutrition.ts`
- Test: `__tests__/nutrition.test.ts`

- [ ] **Step 1: Write the failing test** — add to `__tests__/nutrition.test.ts`:

```ts
import { toBasis, fromBasis } from '../src/utils/nutrition'

describe('basis conversion', () => {
  it('per100g mode is a passthrough', () => {
    expect(toBasis(66, 1500, 'per100g')).toBe(66)
    expect(fromBasis(66, 1500, 'per100g')).toBe(66)
  })
  it('total mode scales by full grams (weight x qty)', () => {
    expect(toBasis(66, 1500, 'total')).toBe(990)      // 66/100g over 1500g
    expect(fromBasis(990, 1500, 'total')).toBe(66)
  })
  it('guards G = 0 (unknown weight)', () => {
    expect(toBasis(66, 0, 'total')).toBe(0)
    expect(fromBasis(990, 0, 'total')).toBe(0)
  })
})
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx jest __tests__/nutrition.test.ts -t "basis conversion"`
Expected: FAIL (not exported).

- [ ] **Step 3: Implement** — append to `src/utils/nutrition.ts` (add `NutritionBasis` to the import from `../types`):

```ts
/** Canonical per-100g value -> value displayed in `basis` over G grams (weight x qty). */
export function toBasis(per100g: number, G: number, basis: NutritionBasis): number {
  return basis === 'per100g' ? per100g : G > 0 ? (per100g * G) / 100 : 0
}

/** Value shown in `basis` over G grams -> canonical per-100g. */
export function fromBasis(shown: number, G: number, basis: NutritionBasis): number {
  return basis === 'per100g' ? shown : G > 0 ? (shown * 100) / G : 0
}
```

- [ ] **Step 4: Run it, expect pass** — `npx jest __tests__/nutrition.test.ts -t "basis conversion"` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/nutrition.ts __tests__/nutrition.test.ts
git commit -m "feat: add per-100g<->total nutrition basis conversion"
```

---

### Task 3: Show total quantity in the detail view (#1)

**Files:**
- Modify: `src/components/ItemDetail.tsx` (the item stat row, currently lines ~220-223)
- Test: `__tests__/ItemDetail.test.tsx`

- [ ] **Step 1: Write the failing test** — add to `__tests__/ItemDetail.test.tsx` (follow the existing render helper in that file; an item with `weightG: 500, quantity: 3`):

```ts
it('shows total bought weight (weightG x quantity) with a per-unit subtitle', () => {
  const { getByText } = renderItemDetail({ name: 'Rice', weightG: 500, kcal: 650, quantity: 3, emoji: '🍚' })
  expect(getByText('1,500 g')).toBeTruthy()
  expect(getByText('3 × 500 g')).toBeTruthy()
})
```
(If the file has no shared `renderItemDetail`, mirror the existing test's render call and props.)

- [ ] **Step 2: Run it, expect failure**

Run: `npx jest __tests__/ItemDetail.test.tsx -t "total bought"`
Expected: FAIL (`500 g` shown, no subtitle).

- [ ] **Step 3: Implement** — in `src/components/ItemDetail.tsx`, replace the "bought" stat card. Current:

```tsx
<View style={styles.stat}><Text style={styles.statV}>{item.weightG.toLocaleString()}g</Text><Text style={styles.statL}>bought</Text></View>
```
becomes (compute `const boughtG = item.weightG * (item.quantity ?? 1)` alongside `cals` near line 125):

```tsx
<View style={styles.stat}>
  <Text style={styles.statV}>{boughtG.toLocaleString()} g</Text>
  <Text style={styles.statL}>bought</Text>
  {(item.quantity ?? 1) > 1 && (
    <Text style={styles.statSub}>{item.quantity} × {item.weightG.toLocaleString()} g</Text>
  )}
</View>
```
Add a `statSub` style near `statL`: `statSub: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint, marginTop: 2 }`.

- [ ] **Step 4: Run it, expect pass** — `npx jest __tests__/ItemDetail.test.tsx` (whole file) → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemDetail.tsx __tests__/ItemDetail.test.tsx
git commit -m "feat: detail view shows total bought weight (weight x qty)"
```

---

### Task 4: `NutritionFields` shared component (toggle + 4 fields)

**Files:**
- Create: `src/components/NutritionFields.tsx`
- Test: `__tests__/NutritionFields.test.tsx`

Contract:
```ts
type Props = {
  basis: NutritionBasis
  onBasisChange: (b: NutritionBasis) => void
  G: number                                   // weightG × quantity
  kcalPer100g: number | null                  // canonical
  macrosPer100g?: Macros                      // canonical
  onChange: (next: { kcalPer100g: number | null; macrosPer100g?: Macros }) => void
  editable: boolean
}
```
Behavior: holds local input strings, initialized from `toBasis(canonical, G, basis)`; re-initializes via `useEffect` when `basis`/`G`/canonical props change; on each edit converts the string back with `fromBasis` and calls `onChange`. Blank field → `null`/`undefined` (not 0). Rounds displayed values with `roundTenth`.

- [ ] **Step 1: Write the failing test** — `__tests__/NutritionFields.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import NutritionFields from '../src/components/NutritionFields'

const base = {
  G: 1500, kcalPer100g: 66, macrosPer100g: { protein: 4, carbs: 7, fat: 2 },
  editable: true, onChange: jest.fn(), onBasisChange: jest.fn(),
}

it('shows per-100g values in per100g mode', () => {
  const { getByTestId } = render(<NutritionFields {...base} basis="per100g" />)
  expect(getByTestId('nf-kcal').props.value).toBe('66')
})

it('shows totals over G in total mode', () => {
  const { getByTestId } = render(<NutritionFields {...base} basis="total" />)
  expect(getByTestId('nf-kcal').props.value).toBe('990')  // 66/100g × 1500g
})

it('edits convert back to canonical per-100g', () => {
  const onChange = jest.fn()
  const { getByTestId } = render(<NutritionFields {...base} basis="total" onChange={onChange} />)
  fireEvent.changeText(getByTestId('nf-kcal'), '1500')     // 1500 kcal over 1500g -> 100/100g
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kcalPer100g: 100 }))
})
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx jest __tests__/NutritionFields.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/components/NutritionFields.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Macros, NutritionBasis } from '../types'
import { toBasis, fromBasis, roundTenth } from '../utils/nutrition'

type Props = {
  basis: NutritionBasis
  onBasisChange: (b: NutritionBasis) => void
  G: number
  kcalPer100g: number | null
  macrosPer100g?: Macros
  onChange: (next: { kcalPer100g: number | null; macrosPer100g?: Macros }) => void
  editable: boolean
}

const show = (per100: number | null | undefined, G: number, basis: NutritionBasis) =>
  per100 == null ? '' : String(roundTenth(toBasis(per100, G, basis)))

export default function NutritionFields({ basis, onBasisChange, G, kcalPer100g, macrosPer100g, onChange, editable }: Props) {
  const colors = useColors()
  const [kcal, setKcal] = useState(show(kcalPer100g, G, basis))
  const [p, setP] = useState(show(macrosPer100g?.protein, G, basis))
  const [c, setC] = useState(show(macrosPer100g?.carbs, G, basis))
  const [f, setF] = useState(show(macrosPer100g?.fat, G, basis))

  // Re-sync display strings when basis / grams / canonical values change.
  useEffect(() => {
    setKcal(show(kcalPer100g, G, basis)); setP(show(macrosPer100g?.protein, G, basis))
    setC(show(macrosPer100g?.carbs, G, basis)); setF(show(macrosPer100g?.fat, G, basis))
  }, [basis, G, kcalPer100g, macrosPer100g])

  const emit = (nk: string, np: string, nc: string, nf: string) => {
    const canon = (s: string): number | null => {
      const n = parseFloat(s)
      return s.trim() === '' || isNaN(n) ? null : roundTenth(fromBasis(n, G, basis))
    }
    const k = canon(nk)
    const mp = canon(np), mc = canon(nc), mf = canon(nf)
    const macros = mp == null && mc == null && mf == null ? undefined
      : { protein: mp ?? 0, carbs: mc ?? 0, fat: mf ?? 0 }
    onChange({ kcalPer100g: k, macrosPer100g: macros })
  }

  const unit = basis === 'per100g' ? '/ 100g' : 'total'
  const styles = useMemo(() => StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    lbl: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.mossFaint },
    seg: { flexDirection: 'row', backgroundColor: colors.sageBg2, borderRadius: 10, padding: 2 },
    segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    segOn: { backgroundColor: colors.white },
    segTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.moss },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
    name: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.num, fontSize: 15, color: colors.forest, textAlign: 'right', minWidth: 70, padding: 0 },
    unit: { fontFamily: fonts.body, fontSize: 11, color: colors.mossFaint, marginLeft: 6, minWidth: 42 },
  }), [colors])

  const Field = (label: string, tid: string, val: string, set: (s: string) => void) => (
    <View style={styles.row}>
      <Text style={styles.name}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput testID={tid} style={styles.input} value={val} editable={editable}
          keyboardType="decimal-pad" selectTextOnFocus
          onChangeText={(t) => {
            set(t)
            const vals = { kcal, p, c, f, [tid === 'nf-kcal' ? 'kcal' : tid === 'nf-protein' ? 'p' : tid === 'nf-carbs' ? 'c' : 'f']: t }
            emit(vals.kcal, vals.p, vals.c, vals.f)
          }} />
        <Text style={styles.unit}>{label === 'Calories' ? `kcal ${unit}` : `g ${unit}`}</Text>
      </View>
    </View>
  )

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.lbl}>Nutrition</Text>
        <View style={styles.seg}>
          {(['per100g', 'total'] as NutritionBasis[]).map((b) => (
            <TouchableOpacity key={b} testID={`nf-basis-${b}`} style={[styles.segBtn, basis === b && styles.segOn]} onPress={() => onBasisChange(b)}>
              <Text style={styles.segTxt}>{b === 'per100g' ? 'per 100g' : 'total'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {Field('Calories', 'nf-kcal', kcal, setKcal)}
      {Field('Protein', 'nf-protein', p, setP)}
      {Field('Carbs', 'nf-carbs', c, setC)}
      {Field('Fat', 'nf-fat', f, setF)}
    </View>
  )
}
```

- [ ] **Step 4: Run it, expect pass** — `npx jest __tests__/NutritionFields.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/NutritionFields.tsx __tests__/NutritionFields.test.tsx
git commit -m "feat: NutritionFields component with per-100g/total toggle"
```

---

### Task 5: Wire `NutritionFields` into the add sheet (#2, #5)

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (replace the single per-100g calorie field with `NutritionFields`; thread `basis`/`onBasisChange`)
- Modify: `App.tsx` (pass `prefs.nutritionBasis` + a setter that writes the pref)
- Test: `__tests__/AddItemSheet.test.tsx`

- [ ] **Step 1: Write the failing test** — add to `__tests__/AddItemSheet.test.tsx`:

```tsx
it('prefills macros from a tapped suggestion and shows them editable', async () => {
  const { getByText, getByTestId } = renderAddSheet()   // manual mode
  fireEvent.changeText(getByTestId('manual-name-input'), 'Kale')
  fireEvent.press(await findByText('Kale'))              // a local suggestion with macros
  expect(getByTestId('nf-protein').props.value).not.toBe('')
})
```
(Use the file's existing render helper + a suggestion known to carry macros; mirror the existing "autofills from a tapped local suggestion" test for the setup, including pressing `Custom (g)` if that test does.)

- [ ] **Step 2: Run it, expect failure** — `npx jest __tests__/AddItemSheet.test.tsx -t "prefills macros"` → FAIL (`nf-protein` not found).

- [ ] **Step 3: Implement:**
  - Add prop `basis: NutritionBasis` and `onBasisChange: (b: NutritionBasis) => void` to `AddItemSheet`'s Props and destructure.
  - Replace the manual per-100g calorie `TextInput` (the `manualKcal100` field / read-only summary calorie line) with:
    ```tsx
    <NutritionFields
      basis={basis} onBasisChange={onBasisChange}
      G={weightNum * qty}
      kcalPer100g={effectivePer100g}
      macrosPer100g={macrosPer100g}
      onChange={({ kcalPer100g, macrosPer100g }) => { setKcalPer100g(kcalPer100g); setMacrosPer100g(macrosPer100g) }}
      editable={isManual || editing}
    />
    ```
    Keep the existing `weightNum`, `qty`, `effectivePer100g` derivations; delete the now-redundant `manualKcal100` string state and its field. The suggestion-select handler already calls `setKcalPer100g` + `setMacrosPer100g`, so macros now render in the block.
  - In `App.tsx`, pass `basis={prefs.nutritionBasis}` and `onBasisChange={(b) => setPrefs((p) => ({ ...p, nutritionBasis: b }))}` to `<AddItemSheet .../>`.

- [ ] **Step 4: Run tests** — `npx jest __tests__/AddItemSheet.test.tsx` → PASS (fix any existing test that referenced the removed calorie field by pointing it at `nf-kcal`). `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddItemSheet.tsx App.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: editable macros + basis toggle in add sheet"
```

---

### Task 6: Wire `NutritionFields` into the detail edit mode (#5)

**Files:**
- Modify: `src/components/ItemDetail.tsx` (replace the total-only "Calories" edit field with `NutritionFields`; thread `basis`/`onBasisChange`)
- Modify: `App.tsx` (pass `basis`/`onBasisChange` to `<ItemDetail .../>`)
- Test: `__tests__/ItemDetail.test.tsx`

- [ ] **Step 1: Write the failing test:**

```tsx
it('edits nutrition in the chosen basis and saves canonical values', () => {
  const onSaveItem = jest.fn()
  const { getByText, getByTestId } = renderItemDetail(
    { name: 'Rice', weightG: 500, kcal: 650, quantity: 1, macrosPer100g: { protein: 8, carbs: 28, fat: 1 } },
    { onSaveItem, basis: 'per100g' })
  fireEvent.press(getByText('Edit'))
  fireEvent.changeText(getByTestId('nf-kcal'), '130')       // 130 kcal/100g
  fireEvent.press(getByText('Save'))
  expect(onSaveItem).toHaveBeenCalledWith(expect.objectContaining({ kcal: 650 }))  // 130/100g × 500g
})
```

- [ ] **Step 2: Run it, expect failure** — `npx jest __tests__/ItemDetail.test.tsx -t "chosen basis"` → FAIL.

- [ ] **Step 3: Implement:**
  - Add `basis`/`onBasisChange` props to `ItemDetail`.
  - In edit mode, replace the `renderField('Calories', kcalStr, ...)` field (and the separate macro inputs, if the macro block is still in edit mode) with a single `NutritionFields` bound to canonical state: derive `kcalPer100g` from `kcalStr`/`weightStr`, keep macros in `macrosPer100g` state; `G = num(weightStr) * num(qtyStr)`; on change, update the canonical state used by `saveItem`. `saveItem` already computes `macrosPer100g` and per-unit `kcal` from weight — ensure it reads the canonical `kcalPer100g` the block produces (`kcal = kcalForWeight(kcalPer100g, w)`).
  - In `App.tsx`, pass `basis={prefs.nutritionBasis}` + the same `onBasisChange` setter to `<ItemDetail .../>`.

- [ ] **Step 4: Run tests** — `npx jest __tests__/ItemDetail.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemDetail.tsx App.tsx __tests__/ItemDetail.test.tsx
git commit -m "feat: basis toggle + editable macros in item detail edit"
```

---

## Phase 2 — Save to "My Foods" + barcode linking

### Task 7: Unified "Save to My Foods" toggle (#3)

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (replace the "Remember" toggle with a "Save to My Foods" toggle, default on; label "Update '<name>'" when a saved food matches)
- Modify: `App.tsx` (`handleAddItem`: save/skip based on the toggle instead of the "manual always saves" special case)
- Test: `__tests__/AddItemSheet.test.tsx`

- [ ] **Step 1: Write the failing test:**

```tsx
it('reads "Update <name>" when the food already exists in My Foods', () => {
  const custom = [{ id: 'cf1', name: 'Kale', emoji: '🥬', kcalPer100g: 33, createdAt: 1, updatedAt: 1 }]
  const { getByText } = renderAddSheet({ customFoods: custom, initialName: 'Kale' })
  expect(getByText(/Update .Kale./)).toBeTruthy()
})
```

- [ ] **Step 2: Run it, expect failure** — FAIL (toggle text is "Remember").

- [ ] **Step 3: Implement:**
  - Add `saveToFoods: boolean` state (default `true`) in `AddItemSheet`; render a toggle labeled `Save to My Foods`, or ``Update “${match.name}”`` when `findCustomByName/Barcode` finds a match (add a small `findCustomByName` in `customFoods.ts` mirroring `findCustomByBarcode`, or reuse `searchCustomFoods` exact-name match). Remove the old `showRemember`/`saveForLater` UI.
  - Pass the toggle value out via a new `onAdd` field or a dedicated `save` flag on the added item; simplest: extend `onAdd(item, { save: boolean })` OR keep item-only and add `onSaveToFoods?(save: boolean)` called just before `onAdd`. Choose the item-plus-flag signature and update the single call site.
  - In `App.tsx` `handleAddItem`, replace ``if (!wasScanned || saveForLater)`` with ``if (save)`` using the flag.

- [ ] **Step 4: Run tests** — `npx jest __tests__/AddItemSheet.test.tsx __tests__/App.addToCycle.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddItemSheet.tsx App.tsx src/services/customFoods.ts __tests__/AddItemSheet.test.tsx
git commit -m "feat: unified Save to My Foods toggle (default on)"
```

---

### Task 8: "Link a barcode" to a custom food (#4)

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (a "Link a barcode" button shown when no barcode yet; opens the scanner, stores the code, shows "Barcode linked ✓")
- Modify: `App.tsx` (thread the linked barcode into the `upsertCustomFood` call)
- Test: `__tests__/AddItemSheet.test.tsx`

- [ ] **Step 1: Write the failing test** (mock the scan service to return a code):

```tsx
it('links a scanned barcode to the food being saved', async () => {
  const onScanForBarcode = jest.fn(() => Promise.resolve('50000001'))
  const { getByText, findByText } = renderAddSheet({ onScanForBarcode, initialName: 'Home Hummus' })
  fireEvent.press(getByText('Link a barcode'))
  expect(await findByText('Barcode linked ✓')).toBeTruthy()
})
```

- [ ] **Step 2: Run it, expect failure** — FAIL (no such button).

- [ ] **Step 3: Implement:**
  - Add prop `onScanForBarcode?: () => Promise<string | null>` to `AddItemSheet`; add `linkedBarcode` state. The button (shown when `!product?.barcode && !linkedBarcode`) calls it, sets `linkedBarcode`, and swaps to a "Barcode linked ✓" label.
  - Include `linkedBarcode` when building the `CustomFood` on save (pass it through the `onAdd`/save flag path from Task 7 so `customFoodFromItem(item, linkedBarcode)` receives it).
  - In `App.tsx`, implement `onScanForBarcode` using the existing `scan.ts` camera flow (return the scanned code without adding an item), and pass `linkedBarcode` into `customFoodFromItem`.

- [ ] **Step 4: Run tests** — `npx jest __tests__/AddItemSheet.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddItemSheet.tsx App.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: link a barcode to a custom food"
```

---

## Final verification

- [ ] `npx tsc --noEmit` → clean
- [ ] `npx jest` → all green
- [ ] On-device smoke (Fast Refresh): add a 3×500g item → detail shows 1,500 g; toggle per-100g/total in add + detail; edit a searched food's macros; Save to My Foods off/on; link a barcode. (Camera needs a device, not the simulator.)

## Spec coverage check
- #1 total qty → Task 3 · #5 basis clarity → Tasks 1,2,4,5,6 · #2 editable DB macros → Tasks 4,5 · #3 save/update to DB → Task 7 · #4 custom + barcode → Task 8. Phase 3 (#6 label OCR) → separate plan.
