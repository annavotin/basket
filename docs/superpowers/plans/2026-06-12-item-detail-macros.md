# Item-detail popup + per-food macros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic ItemDetail bottom-sheet (basket item / extra / pantry) showing calories + macros with tap-to-type edit and inline confirm-delete, plus a per-food macro data model (catalog + Open Food Facts, kcal-derived estimate fallback).

**Architecture:** A new `Macros` type and optional `FoodItem.macrosPer100g`; an `itemMacros` helper (real vs estimate). Macros flow in from `foods.ts` (catalog) and `foodApi.ts` (OFF nutriments) through `AddItemSheet`. A single `ItemDetail` `Modal` is driven by a `detailTarget` state in `App.tsx`; taps from the basket/extras/pantry lists open it. It replaces and deletes `EditItemSheet`; inline ✕ delete buttons are removed in favour of an in-sheet confirm.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-12-item-detail-macros-design.md`

---

### Task 1: Macros type + itemMacros helper

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/nutrition.ts`
- Test: `__tests__/nutrition.test.ts`

- [ ] **Step 1: Add the type.** In `src/types.ts`, add near `MacroTargets`:
```ts
export type Macros = { protein: number; carbs: number; fat: number }
```
and change `FoodItem` to include the optional profile (add the one field, keep the rest):
```ts
export type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
  quantity?: number
  source?: 'barcode' | 'receipt' | 'manual'
  macrosPer100g?: Macros
}
```

- [ ] **Step 2: Write the failing test.** Append to `__tests__/nutrition.test.ts` (merge the import names into the existing `'../src/utils/nutrition'` import line):
```ts
import { itemMacros } from '../src/utils/nutrition'

describe('itemMacros', () => {
  it('uses the per-100g profile scaled by weight and quantity', () => {
    const item = { name: 'Salmon', weightG: 600, kcal: 1254, emoji: '🐟', macrosPer100g: { protein: 20, carbs: 0, fat: 13 } }
    expect(itemMacros(item)).toEqual({ protein: 120, carbs: 0, fat: 78 })
  })
  it('multiplies by quantity', () => {
    const item = { name: 'Bar', weightG: 100, kcal: 200, emoji: '🍫', quantity: 2, macrosPer100g: { protein: 10, carbs: 20, fat: 5 } }
    expect(itemMacros(item)).toEqual({ protein: 20, carbs: 40, fat: 10 })
  })
  it('falls back to the kcal estimate (times quantity) when no profile', () => {
    const item = { name: 'Mystery', weightG: 100, kcal: 1000, emoji: '❓', quantity: 2 }
    expect(itemMacros(item)).toEqual({ protein: 125, carbs: 225, fat: 67 }) // kcalDerivedMacros(2000)
  })
})
```

- [ ] **Step 3: Run, confirm fail.** Run: `npm test -- nutrition` → FAIL (`itemMacros` not exported).

- [ ] **Step 4: Implement.** Append to `src/utils/nutrition.ts`:
```ts
import { FoodItem, Macros } from '../types'  // extend the existing type import if needed

/** Total macro grams for an item (includes quantity), mirroring totalKcal.
 *  Uses the per-100g profile when present, else the kcal-derived estimate. */
export function itemMacros(item: FoodItem): Macros {
  const qty = item.quantity ?? 1
  if (item.macrosPer100g) {
    const f = (item.weightG / 100) * qty
    return {
      protein: item.macrosPer100g.protein * f,
      carbs: item.macrosPer100g.carbs * f,
      fat: item.macrosPer100g.fat * f,
    }
  }
  return kcalDerivedMacros(item.kcal * qty)
}
```
(If `src/utils/nutrition.ts` already imports from `'../types'`, add `Macros` and `FoodItem` to that import rather than adding a second line.)

- [ ] **Step 5: Run, confirm pass.** Run: `npm test -- nutrition` → PASS.

- [ ] **Step 6: Commit.**
```bash
git add src/types.ts src/utils/nutrition.ts __tests__/nutrition.test.ts
git commit -m "feat: Macros type + itemMacros helper (real profile vs kcal estimate)"
```

---

### Task 2: Catalog macros (foods.ts)

**Files:**
- Modify: `src/foods.ts`
- Test: `__tests__/foods.test.ts`

- [ ] **Step 1: Write the failing test.** Append to `__tests__/foods.test.ts`:
```ts
import { LOCAL_FOODS } from '../src/foods'

describe('LOCAL_FOODS macros', () => {
  it('every food has a per-100g macro profile with numeric P/C/F', () => {
    for (const f of LOCAL_FOODS) {
      expect(f.macrosPer100g).toBeDefined()
      expect(typeof f.macrosPer100g!.protein).toBe('number')
      expect(typeof f.macrosPer100g!.carbs).toBe('number')
      expect(typeof f.macrosPer100g!.fat).toBe('number')
    }
  })
})
```
(If `__tests__/foods.test.ts` doesn't exist, create it with the import block above plus this describe.)

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- foods` → FAIL (`macrosPer100g` undefined).

- [ ] **Step 3: Implement.** In `src/foods.ts`:
  1. Add `macrosPer100g?: Macros` to the `FoodSuggestion` type and to the internal `LocalFood` type; import `Macros` from `'./types'`.
  2. Add a realistic `macrosPer100g: { protein, carbs, fat }` (grams per 100 g) to **every** entry in `LOCAL_FOODS`. Use sensible nutrition values per food (these are not reviewed for precision — just plausible, e.g. `Apple → { protein: 0.3, carbs: 14, fat: 0.2 }`, `Chicken breast → { protein: 31, carbs: 0, fat: 3.6 }`, `Rice (cooked) → { protein: 2.7, carbs: 28, fat: 0.3 }`). For any leafy/produce item, low protein/fat and carbs roughly tracking the kcal.
  3. Wherever a `LocalFood` is turned into a `FoodSuggestion` (the local-search mapping), carry `macrosPer100g` through.

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- foods` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/foods.ts __tests__/foods.test.ts
git commit -m "feat: per-100g macros on the curated food catalog"
```

---

### Task 3: OFF macro extraction (foodApi.ts + Product)

**Files:**
- Modify: `src/mockProducts.ts` (Product type)
- Modify: `src/services/foodApi.ts`
- Test: `__tests__/foodApi.test.ts`

- [ ] **Step 1: Extend the Product type.** In `src/mockProducts.ts`, add to `Product`:
```ts
  macrosPer100g?: Macros
```
and import `Macros` from `'./types'`.

- [ ] **Step 2: Write the failing test.** Append to `__tests__/foodApi.test.ts` (reuse the file's existing fetch-stub style):
```ts
import { lookupProductByBarcode } from '../src/services/foodApi'

function fetchReturning(product: any) {
  return async () => ({ ok: true, json: async () => ({ product }) }) as any
}

describe('OFF macro extraction', () => {
  it('reads proteins/carbohydrates/fat per 100g into macrosPer100g', async () => {
    const p = await lookupProductByBarcode('x', {
      fetch: fetchReturning({
        product_name: 'Yogurt', product_quantity: '500',
        nutriments: { 'energy-kcal_100g': 59, proteins_100g: 10, carbohydrates_100g: 4, fat_100g: 0.4 },
      }),
    })
    expect(p?.macrosPer100g).toEqual({ protein: 10, carbs: 4, fat: 0.4 })
  })
  it('leaves macrosPer100g undefined when nutriments lack them', async () => {
    const p = await lookupProductByBarcode('x', {
      fetch: fetchReturning({ product_name: 'Plain', product_quantity: '500', nutriments: { 'energy-kcal_100g': 100 } }),
    })
    expect(p?.macrosPer100g).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run, confirm fail.** Run: `npm test -- foodApi` → FAIL.

- [ ] **Step 4: Implement.** In `src/services/foodApi.ts`:
  1. Add `proteins_100g,carbohydrates_100g,fat_100g` to the `FIELDS` and `SEARCH_FIELDS` constants.
  2. Add a helper:
```ts
function macrosFrom(nutriments: any): Macros | undefined {
  const p = nutriments?.proteins_100g, c = nutriments?.carbohydrates_100g, f = nutriments?.fat_100g
  if ([p, c, f].some((n) => typeof n !== 'number')) return undefined
  return { protein: p, carbs: c, fat: f }
}
```
  (import `Macros` from `'../types'`.)
  3. In `lookupProductByBarcode`, set `macrosPer100g: macrosFrom(p.nutriments)` on the returned `Product`.
  4. In `searchProductsByName`, set `macrosPer100g: macrosFrom(p?.nutriments)` on each pushed `FoodSuggestion`.

- [ ] **Step 5: Run, confirm pass.** Run: `npm test -- foodApi` → PASS.

- [ ] **Step 6: Commit.**
```bash
git add src/mockProducts.ts src/services/foodApi.ts __tests__/foodApi.test.ts
git commit -m "feat: pull per-100g macros from Open Food Facts nutriments"
```

---

### Task 4: Thread macros through AddItemSheet

**Files:**
- Modify: `src/components/AddItemSheet.tsx`
- Test: `__tests__/AddItemSheet.test.tsx` (if present; else verify via existing suite + a new focused test)

- [ ] **Step 1: Write/extend a test.** In `__tests__/AddItemSheet.test.tsx` (create if missing, mirroring how other component tests render with `ThemeProvider`), add a test that renders the sheet with a `product` carrying `macrosPer100g`, taps Add, and asserts the `onAdd` payload includes `macrosPer100g` equal to the product's:
```ts
it('passes the product macrosPer100g onto the added item', () => {
  const onAdd = jest.fn()
  const product = { name: 'Yogurt', emoji: '🥛', packageWeightG: 500, kcalPer100g: 59, macrosPer100g: { protein: 10, carbs: 4, fat: 0.4 } }
  const { getByText } = render(
    <ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>
      <AddItemSheet visible product={product} onAdd={onAdd} onClose={() => {}} />
    </ThemeProvider>
  )
  fireEvent.press(getByText(/Add/i))   // adjust matcher to the actual Add button label
  expect(onAdd.mock.calls[0][0].macrosPer100g).toEqual({ protein: 10, carbs: 4, fat: 0.4 })
})
```
(If an AddItemSheet test already exists, append this case and reuse its render helper/Add-button matcher.)

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- AddItemSheet` → FAIL (payload lacks `macrosPer100g`).

- [ ] **Step 3: Implement.** In `src/components/AddItemSheet.tsx`:
  1. Track the selected source's macros: add `const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>(undefined)` (import `Macros` from `'../types'`).
  2. When a `product` is applied (the effect that calls `setKcalPer100g(product.kcalPer100g)`), also `setMacrosPer100g(product.macrosPer100g)`.
  3. When a suggestion is picked (the handler that calls `setKcalPer100g(s.kcalPer100g)`), also `setMacrosPer100g(s.macrosPer100g)`.
  4. For free-typed manual entry, leave it `undefined`.
  5. In the `onAdd({...})` payload, add `macrosPer100g`.

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- AddItemSheet` → PASS. Then `npm test` → all green.

- [ ] **Step 5: Commit.**
```bash
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: carry catalog/OFF macros onto added basket items"
```

---

### Task 5: ItemDetail component

**Files:**
- Create: `src/components/ItemDetail.tsx`
- Test: `__tests__/ItemDetail.test.tsx`

- [ ] **Step 1: Write the failing test.** Create `__tests__/ItemDetail.test.tsx`:
```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import ItemDetail from '../src/components/ItemDetail'
import { FoodItem, ExtraMeal, PantryItem } from '../src/types'

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme="light" accent={['#7CC96E', '#5FB152', '#3E8F38']}>{ui}</ThemeProvider>
)

const item: FoodItem = { name: 'Salmon', weightG: 600, kcal: 1254, emoji: '🐟', source: 'barcode', macrosPer100g: { protein: 20, carbs: 0, fat: 13 } }

describe('ItemDetail — basket item', () => {
  it('shows kcal and macro grams', () => {
    const { getByText } = wrap(<ItemDetail visible kind="item" item={item} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSaveItem={jest.fn()} />)
    expect(getByText('1,254')).toBeTruthy()
    expect(getByText('Scanned')).toBeTruthy()
    expect(getByText('120g')).toBeTruthy() // protein 20 * 600/100
  })

  it('rescales kcal + macros when weight changes, and saves the patch', () => {
    const onSaveItem = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="item" item={item} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSaveItem={onSaveItem} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-weight'), '300') // halve the weight
    fireEvent.press(getByText('Save'))
    const patch = onSaveItem.mock.calls[0][0]
    expect(patch.weightG).toBe(300)
    expect(patch.kcal).toBe(627)                         // 1254 halved
    expect(patch.macrosPer100g).toEqual({ protein: 20, carbs: 0, fat: 13 }) // profile unchanged by proportional rescale
  })

  it('confirms before removing', () => {
    const onRemove = jest.fn()
    const { getByText } = wrap(<ItemDetail visible kind="item" item={item} days={5} onRemove={onRemove} onClose={jest.fn()} onSaveItem={jest.fn()} />)
    fireEvent.press(getByText('Remove from basket'))
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.press(getByText('Delete'))
    expect(onRemove).toHaveBeenCalled()
  })
})

describe('ItemDetail — extra', () => {
  const extra: ExtraMeal = { id: 'e1', date: '2026-06-04', name: 'Pizza slice', kcal: 285 }
  it('edits name + kcal and saves', () => {
    const onSaveExtra = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="extra" extra={extra} days={5} dateLabel="4 Jun" onRemove={jest.fn()} onClose={jest.fn()} onSaveExtra={onSaveExtra} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-extra-kcal'), '300')
    fireEvent.press(getByText('Save'))
    expect(onSaveExtra).toHaveBeenCalledWith({ name: 'Pizza slice', kcal: 300 })
  })
})

describe('ItemDetail — pantry', () => {
  const pantryItem: PantryItem = { id: 'p1', name: 'Oats', emoji: '🌾', kcalPer100g: 389, dailyG: 40 }
  it('edits kcal/100g + daily g and saves', () => {
    const onSavePantry = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="pantry" pantryItem={pantryItem} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSavePantry={onSavePantry} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-pantry-daily'), '50')
    fireEvent.press(getByText('Save'))
    expect(onSavePantry).toHaveBeenCalledWith({ kcalPer100g: 389, dailyG: 50 })
  })
})
```

- [ ] **Step 2: Run, confirm fail.** Run: `npm test -- ItemDetail` → FAIL (module not found).

- [ ] **Step 3: Implement `src/components/ItemDetail.tsx`.**
```tsx
import React, { useMemo, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { FoodItem, ExtraMeal, PantryItem, Macros } from '../types'
import { itemMacros, kcalDerivedMacros } from '../utils/nutrition'

type Kind = 'item' | 'extra' | 'pantry'
const SRC_LABELS: Record<string, string> = { barcode: 'Scanned', receipt: 'Receipt', manual: 'Manual' }
const MAC_DEFS: { key: keyof Macros; label: string; kcalPerG: number }[] = [
  { key: 'protein', label: 'Protein', kcalPerG: 4 },
  { key: 'carbs', label: 'Carbs', kcalPerG: 4 },
  { key: 'fat', label: 'Fat', kcalPerG: 9 },
]

type Props = {
  visible: boolean
  kind: Kind
  item?: FoodItem
  extra?: ExtraMeal
  pantryItem?: PantryItem
  days: number
  dateLabel?: string
  onSaveItem?: (patch: Partial<FoodItem>) => void
  onSaveExtra?: (patch: { name: string; kcal: number }) => void
  onSavePantry?: (patch: { kcalPer100g: number; dailyG: number }) => void
  onRemove: () => void
  onClose: () => void
}

const num = (s: string) => (parseFloat(s) > 0 ? parseFloat(s) : 0)

export default function ItemDetail(props: Props) {
  const { visible, kind, item, extra, pantryItem, days, dateLabel, onClose, onRemove } = props
  const colors = useColors()
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  // ---- edit string-state (re-seeded on startEdit) ----
  const [name, setName] = useState('')
  const [weightStr, setWeightStr] = useState('')
  const [kcalStr, setKcalStr] = useState('')
  const [qtyStr, setQtyStr] = useState('1')
  const [pStr, setPStr] = useState('0')
  const [cStr, setCStr] = useState('0')
  const [fStr, setFStr] = useState('0')
  const [per100Str, setPer100Str] = useState('0')
  const [dailyStr, setDailyStr] = useState('0')

  function seed() {
    setConfirmDel(false)
    if (kind === 'item' && item) {
      const m = itemMacros({ ...item, quantity: 1 }) // per-unit grams for display
      setName(item.name)
      setWeightStr(String(item.weightG))
      setKcalStr(String(item.kcal))
      setQtyStr(String(item.quantity ?? 1))
      setPStr(String(Math.round(m.protein)))
      setCStr(String(Math.round(m.carbs)))
      setFStr(String(Math.round(m.fat)))
    } else if (kind === 'extra' && extra) {
      setName(extra.name)
      setKcalStr(String(extra.kcal))
    } else if (kind === 'pantry' && pantryItem) {
      setPer100Str(String(pantryItem.kcalPer100g))
      setDailyStr(String(pantryItem.dailyG))
    }
  }
  function startEdit() { seed(); setEditing(true) }

  // proportional rescale when weight changes (item kind)
  function onWeight(next: string) {
    const newW = num(next), oldW = num(weightStr)
    const ratio = oldW > 0 && newW > 0 ? newW / oldW : 1
    if (oldW > 0 && newW > 0) {
      setKcalStr(String(Math.round(num(kcalStr) * ratio)))
      setPStr(String(Math.round(num(pStr) * ratio)))
      setCStr(String(Math.round(num(cStr) * ratio)))
      setFStr(String(Math.round(num(fStr) * ratio)))
    }
    setWeightStr(next)
  }

  function saveItem() {
    const w = Math.round(num(weightStr))
    const perUnitKcal = Math.round(num(kcalStr))
    const macrosPer100g: Macros = w > 0
      ? { protein: (num(pStr) / w) * 100, carbs: (num(cStr) / w) * 100, fat: (num(fStr) / w) * 100 }
      : (item?.macrosPer100g ?? { protein: 0, carbs: 0, fat: 0 })
    props.onSaveItem?.({ name: name.trim() || item?.name || 'Item', weightG: w, kcal: perUnitKcal, quantity: Math.max(1, Math.round(num(qtyStr))), macrosPer100g })
    setEditing(false)
  }
  function saveExtra() { props.onSaveExtra?.({ name: name.trim() || extra?.name || 'Extra', kcal: Math.max(0, Math.round(num(kcalStr))) }); setEditing(false) }
  function savePantry() { props.onSavePantry?.({ kcalPer100g: Math.max(0, Math.round(num(per100Str))), dailyG: Math.max(0, Math.round(num(dailyStr))) }); setEditing(false) }

  // ---- view-mode derived values ----
  const emoji = kind === 'extra' ? '🍴' : kind === 'pantry' ? '🥫' : (item?.emoji ?? '🛒')
  const displayName = kind === 'extra' ? extra?.name : kind === 'pantry' ? pantryItem?.name : item?.name
  const tag = kind === 'item' ? (SRC_LABELS[item?.source ?? 'manual'] ?? 'Manual') : kind === 'extra' ? 'Extra meal' : 'Pantry staple'

  let cals = 0
  if (kind === 'item' && item) cals = item.kcal * (item.quantity ?? 1)
  else if (kind === 'extra' && extra) cals = extra.kcal
  else if (kind === 'pantry' && pantryItem) cals = Math.round((pantryItem.dailyG * days * pantryItem.kcalPer100g) / 100)

  const editingItem = editing && kind === 'item'
  const macroGrams: Macros = editingItem
    ? { protein: num(pStr), carbs: num(cStr), fat: num(fStr) }
    : kind === 'item' && item ? itemMacros(item) : kcalDerivedMacros(cals)
  const macroKcal = MAC_DEFS.map((d) => macroGrams[d.key] * d.kcalPerG)
  const macroSum = Math.max(1, macroKcal.reduce((s, v) => s + v, 0))

  const removeLabel = kind === 'extra' ? 'Delete this extra' : kind === 'pantry' ? 'Remove staple' : 'Remove from basket'
  const estimated = kind !== 'item'

  const styles = useMemo(() => StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    av: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center' },
    avTxt: { fontSize: 27 },
    headTx: { flex: 1, minWidth: 0 },
    name: { fontFamily: fonts.head, fontSize: 19, color: colors.forest },
    tag: { fontFamily: fonts.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, color: colors.moss, marginTop: 3 },
    kc: { alignItems: 'flex-end' },
    kcV: { fontFamily: fonts.display, fontSize: 22, color: colors.matchaDeep },
    kcL: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint },
    stats: { flexDirection: 'row', gap: 9, marginTop: 16 },
    stat: { flex: 1, backgroundColor: colors.sageBg2, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
    statV: { fontFamily: fonts.display, fontSize: 17, color: colors.forest },
    statL: { fontFamily: fonts.body, fontSize: 10, color: colors.mossFaint, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
    when: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss, marginTop: 14 },
    seclbl: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginTop: 18, marginBottom: 10 },
    macroRow: { gap: 11 },
    macro: { },
    macroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    macroL: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.forest },
    macroV: { fontFamily: fonts.display, fontSize: 13, color: colors.forest },
    macroBar: { height: 7, borderRadius: 4, backgroundColor: colors.sage100, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 4, backgroundColor: colors.matcha },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 9 },
    fieldL: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.display, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 80, padding: 0 },
    inputName: { fontFamily: fonts.display, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 140, padding: 0 },
    foot: { fontFamily: fonts.body, fontSize: 12, color: colors.mossFaint, textAlign: 'center', marginTop: 4, marginBottom: 10 },
    btn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 10, backgroundColor: colors.forest },
    btnTxt: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
    ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line },
    ghostTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.moss },
    row: { flexDirection: 'row', gap: 9 },
    danger: { backgroundColor: colors.roseDeep },
    confirm: { marginTop: 10, backgroundColor: 'rgba(180,92,124,.10)', borderRadius: 16, padding: 16 },
    confirmT: { fontFamily: fonts.display, fontSize: 15, color: colors.forest },
    confirmS: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.mossFaint, marginTop: 2, marginBottom: 12 },
  }), [colors])

  // NOTE: called as a function ({renderField(...)}), NOT used as <Field/>. Defining a
  // component inside render and using it as an element gives it a new identity every
  // render, which remounts the TextInput on each keystroke and drops focus. Calling it
  // as a function inlines the elements so React reconciles them in place.
  const renderField = (
    label: string, value: string, onChangeText: (t: string) => void, testID: string,
    keyboardType: 'numeric' | 'default' = 'numeric', isName = false,
  ) => (
    <View style={styles.field} key={testID}>
      <Text style={styles.fieldL}>{label}</Text>
      <TextInput testID={testID} style={isName ? styles.inputName : styles.input} value={value}
        onChangeText={onChangeText} keyboardType={keyboardType} selectTextOnFocus />
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.grab} />

          <View style={styles.head}>
            <View style={styles.av}><Text style={styles.avTxt}>{emoji}</Text></View>
            <View style={styles.headTx}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.tag}>{tag}</Text>
            </View>
            <View style={styles.kc}>
              <Text style={styles.kcV}>{cals.toLocaleString()}</Text>
              <Text style={styles.kcL}>KCAL</Text>
            </View>
          </View>

          {kind === 'item' && item && !editing && (
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statV}>{item.weightG.toLocaleString()}g</Text><Text style={styles.statL}>bought</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{days ? Math.round(cals / days).toLocaleString() : cals}</Text><Text style={styles.statL}>kcal / day</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{item.weightG ? Math.round((item.kcal / item.weightG) * 100) : 0}</Text><Text style={styles.statL}>kcal / 100g</Text></View>
            </View>
          )}
          {kind === 'pantry' && pantryItem && !editing && (
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statV}>{pantryItem.kcalPer100g}</Text><Text style={styles.statL}>kcal / 100g</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{pantryItem.dailyG}g</Text><Text style={styles.statL}>per day</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{(pantryItem.dailyG * days).toLocaleString()}g</Text><Text style={styles.statL}>over {days} days</Text></View>
            </View>
          )}
          {kind === 'extra' && dateLabel && !editing && <Text style={styles.when}>Logged {dateLabel}</Text>}

          <Text style={styles.seclbl}>Macros{estimated ? ' · estimated' : editingItem ? ' · tap to edit' : ''}</Text>
          <View style={styles.macroRow}>
            {MAC_DEFS.map((d, i) => (
              <View style={styles.macro} key={d.key}>
                <View style={styles.macroTop}>
                  <Text style={styles.macroL}>{d.label}</Text>
                  {editingItem
                    ? <TextInput testID={`id-macro-${d.key}`} style={styles.input} keyboardType="numeric" selectTextOnFocus
                        value={d.key === 'protein' ? pStr : d.key === 'carbs' ? cStr : fStr}
                        onChangeText={d.key === 'protein' ? setPStr : d.key === 'carbs' ? setCStr : setFStr} />
                    : <Text style={styles.macroV}>{Math.round(macroGrams[d.key])}g</Text>}
                </View>
                <View style={styles.macroBar}><View style={[styles.macroFill, { width: `${(macroKcal[i] / macroSum) * 100}%` }]} /></View>
              </View>
            ))}
          </View>

          {editing && kind === 'item' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-name', 'default', true)}
              {renderField('Calories', kcalStr, setKcalStr, 'id-kcal')}
              {renderField('Weight (g)', weightStr, onWeight, 'id-weight')}
              {renderField('Quantity', qtyStr, setQtyStr, 'id-qty')}
            </View>
          )}
          {editing && kind === 'extra' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-extra-name', 'default', true)}
              {renderField('Calories', kcalStr, setKcalStr, 'id-extra-kcal')}
            </View>
          )}
          {editing && kind === 'pantry' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Calories / 100g', per100Str, setPer100Str, 'id-pantry-per100')}
              {renderField('Per day (g)', dailyStr, setDailyStr, 'id-pantry-daily')}
            </View>
          )}

          {editing ? (
            <>
              {kind === 'item' && <Text style={styles.foot}>Change weight to rescale; tap any value to override.</Text>}
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.ghost, { flex: 0, width: 100 }]} onPress={() => setEditing(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={kind === 'item' ? saveItem : kind === 'extra' ? saveExtra : savePantry}><Text style={styles.btnTxt}>Save</Text></TouchableOpacity>
              </View>
            </>
          ) : confirmDel ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmT}>Delete {displayName}?</Text>
              <Text style={styles.confirmS}>This can't be undone.</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.ghost, { flex: 0, width: 100, marginTop: 0 }]} onPress={() => setConfirmDel(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.danger, { flex: 1, marginTop: 0 }]} onPress={onRemove}><Text style={styles.btnTxt}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.btn} onPress={startEdit}><Text style={styles.btnTxt}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={() => setConfirmDel(true)}><Text style={styles.ghostTxt}>{removeLabel}</Text></TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
```

- [ ] **Step 4: Run, confirm pass.** Run: `npm test -- ItemDetail` → PASS (all cases). Then `npx tsc --noEmit 2>&1 | grep ItemDetail` → no errors. If a test fails, fix the COMPONENT (e.g. a testID or label) to satisfy it; do not weaken assertions.

- [ ] **Step 5: Commit.**
```bash
git add src/components/ItemDetail.tsx __tests__/ItemDetail.test.tsx
git commit -m "feat: generic ItemDetail sheet (item/extra/pantry) with macros + edit"
```

---

### Task 6: Wire ItemDetail into App; remove inline ✕; delete EditItemSheet

**Files:**
- Modify: `App.tsx`
- Modify: `src/components/MealPrepDetail.tsx`, `src/components/ExtrasPeriodList.tsx`, `src/components/PantryPeriodView.tsx`
- Delete: `src/components/EditItemSheet.tsx`, `__tests__/EditItemSheet.test.tsx` (if present)

- [ ] **Step 1: Add detail state + handlers in `App.tsx`.** After the `editIndex` state add:
```tsx
  type DetailTarget = { kind: 'item'; index: number } | { kind: 'extra'; id: string } | { kind: 'pantry'; id: string }
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null)
```
Add handlers near the other item handlers:
```tsx
  function handleSaveItemPatch(index: number, patch: Partial<FoodItem>) {
    setCycles((prev) => prev.map((c) => c.id === activeCycleId
      ? { ...c, items: c.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) } : c))
  }
  function handleSaveExtraPatch(id: string, patch: { name: string; kcal: number }) {
    setExtraMeals((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  function handleSavePantryPatch(id: string, patch: { kcalPer100g: number; dailyG: number }) {
    setPantry((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function handleDetailRemove(t: DetailTarget) {
    if (t.kind === 'item') setCycles((prev) => prev.map((c) => c.id === activeCycleId ? { ...c, items: c.items.filter((_, i) => i !== t.index) } : c))
    else if (t.kind === 'extra') setExtraMeals((prev) => prev.filter((e) => e.id !== t.id))
    else setPantry((prev) => prev.filter((p) => p.id !== t.id))
    setDetailTarget(null)
  }
```

- [ ] **Step 2: Render ItemDetail in `App.tsx`.** Replace the existing `<EditItemSheet .../>` element (around line 510) with the ItemDetail overlay, and add `import ItemDetail from './src/components/ItemDetail'` (remove the `EditItemSheet` import):
```tsx
        {detailTarget && (
          <ItemDetail
            visible
            kind={detailTarget.kind}
            item={detailTarget.kind === 'item' ? activeCycle?.items[detailTarget.index] : undefined}
            extra={detailTarget.kind === 'extra' ? extraMeals.find((e) => e.id === detailTarget.id) : undefined}
            pantryItem={detailTarget.kind === 'pantry' ? pantry.find((p) => p.id === detailTarget.id) : undefined}
            days={activeDayCount}
            dateLabel={detailTarget.kind === 'extra' ? (() => { const e = extraMeals.find((x) => x.id === detailTarget.id); if (!e) return undefined; const d = formatDay(e.date); return `${d.day} ${d.month}` })() : undefined}
            onSaveItem={(patch) => detailTarget.kind === 'item' && handleSaveItemPatch(detailTarget.index, patch)}
            onSaveExtra={(patch) => detailTarget.kind === 'extra' && handleSaveExtraPatch(detailTarget.id, patch)}
            onSavePantry={(patch) => detailTarget.kind === 'pantry' && handleSavePantryPatch(detailTarget.id, patch)}
            onRemove={() => handleDetailRemove(detailTarget)}
            onClose={() => setDetailTarget(null)}
          />
        )}
```
Remove the now-unused `editIndex`/`setEditIndex` state and `handleEditItem`/`handleSaveEdit` functions only if nothing else references them after the next steps — otherwise repoint them (see Step 3).

- [ ] **Step 3: Repoint the taps to open ItemDetail.**
  - The basket list tap: change `MealPrepDetail`'s `onEditItem={handleEditItem}` to `onEditItem={(index) => setDetailTarget({ kind: 'item', index })}`.
  - `BasketPage`'s `onItemPress`: change from `(index) => { setBasketPageOpen(false); handleEditItem(index) }` to `(index) => setDetailTarget({ kind: 'item', index })` (keep the basket page open underneath — ItemDetail is a Modal and layers on top).
  - Extras list: pass a new `onOpenExtra` to `ExtrasPeriodList` wired to `(id) => setDetailTarget({ kind: 'extra', id })`.
  - Pantry list: pass a new `onOpenPantry` to `PantryPeriodView` wired to `(id) => setDetailTarget({ kind: 'pantry', id })`.
  - Delete `handleEditItem`, `handleSaveEdit`, and `editIndex` state once unreferenced.

- [ ] **Step 4: Remove inline ✕ + make rows tappable in the list components.**
  - `src/components/MealPrepDetail.tsx`: remove the inline remove `TouchableOpacity` (the one rendering the ✕ and calling `onRemoveItem`) and drop the now-unused `onRemoveItem` prop. The row already calls `onEditItem(idx)` on press — keep that.
  - `src/components/ExtrasPeriodList.tsx`: remove the inline ✕ `TouchableOpacity` (calling `onRemoveExtra`); make each extra row a `TouchableOpacity` calling a new `onOpenExtra(e.id)` prop; drop `onRemoveExtra`.
  - `src/components/PantryPeriodView.tsx`: wrap each staple's name/row area in a `TouchableOpacity` calling a new `onOpenPantry(item.id)` prop (keep the existing grams `TextInput` for quick edits).
  - Update the call sites in `App.tsx` to pass the new props and stop passing the removed ones.

- [ ] **Step 5: Delete EditItemSheet.**
```bash
git rm src/components/EditItemSheet.tsx
git rm __tests__/EditItemSheet.test.tsx 2>/dev/null || true
```
Ensure no remaining imports of `EditItemSheet` (`grep -rn EditItemSheet src App.tsx` → empty).

- [ ] **Step 6: Typecheck + full suite.**
Run: `npx tsc --noEmit 2>&1 | grep -v "SettingsScreen.test\|storage.test"` → no new errors.
Run: `npm test` → all suites pass. Fix any list-component tests that referenced the removed ✕ / props (update them to the tap-to-open behaviour; do not delete meaningful assertions).

- [ ] **Step 7: Commit.**
```bash
git add -A
git commit -m "feat: route item/extra/pantry taps to ItemDetail; drop inline delete + EditItemSheet"
```

---

### Task 7: Manual device verification + memory

**Files:** none (verification only)

- [ ] **Step 1: Release build to the phone.**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/basket-*
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "00008030-000D3094013A802E" --configuration Release
```
Expected: Build Succeeded + installs. (The `LANG` prefix avoids the CocoaPods ASCII-8BIT error; device id is Anna's iPhone — re-list with `xcrun xctrace list devices` if changed.)

- [ ] **Step 2: Verify on device.** Confirm: tapping a basket item opens the detail with macros; Edit → changing weight rescales kcal + macros, overriding a macro/kcal works, Save persists (reopen to check); tap an extra and a pantry staple → their detail + edit work; the in-sheet Delete asks to confirm then removes; the basket and extras lists no longer show inline ✕; add a catalog food and an OFF barcode → both show real macros, a free-typed item shows estimated macros.

- [ ] **Step 3: Update memory.** In `/Users/annavotin/.claude/projects/-Users-annavotin-personal-coding-proj-basket/memory/basket-mvp-state.md`, update the Fresh Matcha note: sub-project #2 (item-detail popup + per-food macros) shipped; 5 sub-projects remain (carry-over modal, search add sheet, pantry full redesign, aggregate macro-bar unification, accent-setting removal). Note that `FoodItem` now carries `macrosPer100g` and `EditItemSheet` was deleted (replaced by `ItemDetail`).

---

## Self-Review notes

- **Spec coverage:** Macros type + itemMacros (T1), catalog macros (T2), OFF extraction (T3), add-flow threading (T4), ItemDetail across all three kinds with rescale-on-weight + inline confirm (T5), wiring + remove inline ✕ + delete EditItemSheet (T6), device verify (T7). All spec sections covered.
- **Type consistency:** `Macros = {protein,carbs,fat}` used everywhere; `macrosPer100g` is the field name throughout; `itemMacros`/`kcalDerivedMacros` signatures match Task 1 / sub-project #1. Detail patch shapes match the App save handlers.
- **Edit mechanics:** weight change rescales the kcal/macro string fields by ratio; direct edits override; save converts macro grams → per-100g. View-mode item kcal includes quantity; edit seeds per-unit macros (quantity 1) so the profile math is weight-only.
- **Known deviation:** delete uses an in-sheet confirm (not `Alert.alert`), matching the design; existing list-based removes are replaced by this path.
- **Out of scope confirmed absent:** carry-over modal, search add sheet, pantry redesign, aggregate-bar unification, accent removal.
```
