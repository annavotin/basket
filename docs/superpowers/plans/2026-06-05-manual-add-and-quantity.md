# Manual Add + Autofill + Quantity + Delete-Confirm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified "Add item" sheet with database autofill-as-you-type (local + Open Food Facts), an editable weight + quantity stepper (quantity multiplies calories only), and a native confirm dialog before deleting a stocked item.

**Architecture:** One sheet (`AddItemSheet`) serves both manual and scanned adds. A `useFoodSearch` hook merges instant local matches (`src/foods.ts`) with debounced OFF name-search (`searchProductsByName` in `foodApi.ts`). `FoodItem` gains an optional `quantity`; `totalKcal` multiplies by it. Delete is wrapped in `Alert.alert` in `App`.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Jest + @testing-library/react-native. Spec: `docs/superpowers/specs/2026-06-05-manual-add-and-quantity-design.md`.

**Hard constraints:** TDD red→green→commit. `npx tsc --noEmit` clean and full `npx jest` green after every task. NEVER run `npx expo start` (hangs) — use `npx expo export` for bundle checks. Keep camera / `scan.ts` / native modules out of the jest graph (mock `Alert`, OFF `fetch`).

---

## File Structure

- `src/types.ts` — **modify**: add `quantity?: number` to `FoodItem`.
- `src/utils/nutrition.ts` — **modify**: `totalKcal` multiplies by `quantity`.
- `src/foods.ts` — **create**: `FoodSuggestion` type, `LOCAL_FOODS`, `searchLocalFoods`.
- `src/services/foodApi.ts` — **modify**: add `searchProductsByName`; extract quantity parsing for reuse.
- `src/hooks/useFoodSearch.ts` — **create**: merge local + debounced OFF.
- `src/components/AddItemSheet.tsx` — **modify**: unified name-autofill + editable weight + quantity + calorie preview.
- `src/components/AddFab.tsx` — **modify**: third "Add manually" option.
- `src/components/NewPeriodPanel.tsx` — **modify**: "Add manually" affordance.
- `src/components/MealPrepDetail.tsx` — **modify**: quantity-aware calories + `×N` badge.
- `App.tsx` — **modify**: `handleAddManual`; wrap delete in `Alert`.
- Tests: `__tests__/{nutrition,foods,foodApi,useFoodSearch,AddItemSheet,AddFab,NewPeriodPanel,MealPrepDetail}.test.ts(x)` + `__tests__/App.manualAndDelete.test.tsx`.

---

## Task 1: Data model + quantity-aware budget

**Files:** Modify `src/types.ts`, `src/utils/nutrition.ts`; Test `__tests__/nutrition.test.ts`.

- [ ] **Step 1: Add failing tests** to `__tests__/nutrition.test.ts` (append inside the existing `totalKcal` describe, or add one):

```ts
import { totalKcal } from '../src/utils/nutrition'
import { FoodItem } from '../src/types'

const item = (kcal: number, quantity?: number): FoodItem => ({
  name: 'x', weightG: 100, kcal, emoji: '🛒', quantity,
})

describe('totalKcal with quantity', () => {
  it('treats a missing quantity as 1', () => {
    expect(totalKcal([item(200), item(50)])).toBe(250)
  })
  it('multiplies each item kcal by its quantity', () => {
    expect(totalKcal([item(200, 3), item(50, 2)])).toBe(700)
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/nutrition.test.ts` → FAIL (quantity not applied).

- [ ] **Step 3: Implement.** In `src/types.ts`, add to `FoodItem` after `emoji`:
```ts
  quantity?: number
```
In `src/utils/nutrition.ts` replace `totalKcal`:
```ts
export function totalKcal(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.kcal * (item.quantity ?? 1), 0)
}
```

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/nutrition.test.ts` → PASS. Then `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/types.ts src/utils/nutrition.ts __tests__/nutrition.test.ts
git commit -m "feat: add FoodItem.quantity and make totalKcal quantity-aware"
```

---

## Task 2: Local curated food list + search

**Files:** Create `src/foods.ts`, `__tests__/foods.test.ts`.

- [ ] **Step 1: Write failing test** `__tests__/foods.test.ts`:
```ts
import { searchLocalFoods, LOCAL_FOODS } from '../src/foods'

describe('searchLocalFoods', () => {
  it('returns [] for an empty/blank query', () => {
    expect(searchLocalFoods('')).toEqual([])
    expect(searchLocalFoods('   ')).toEqual([])
  })
  it('matches case-insensitively on name', () => {
    const r = searchLocalFoods('BANA')
    expect(r.some((s) => s.name.toLowerCase().includes('banana'))).toBe(true)
    expect(r.every((s) => s.source === 'local')).toBe(true)
  })
  it('ranks prefix matches before mid-string matches', () => {
    // "pe" prefixes "Pear"/"Pepper"; "Apple" only contains "pp" not "pe" — use a real case:
    const r = searchLocalFoods('app').map((s) => s.name.toLowerCase())
    expect(r[0].startsWith('app')).toBe(true) // Apple ranked first
  })
  it('caps results at 8', () => {
    expect(searchLocalFoods('a').length).toBeLessThanOrEqual(8)
  })
  it('every entry has a positive kcalPer100g and an emoji', () => {
    expect(LOCAL_FOODS.every((f) => f.kcalPer100g > 0 && !!f.emoji)).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/foods.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** `src/foods.ts`:
```ts
export type FoodSuggestion = {
  name: string
  emoji: string
  kcalPer100g: number
  packageWeightG?: number
  source: 'local' | 'off'
}

type LocalFood = { name: string; emoji: string; kcalPer100g: number }

// Curated, produce-heavy list of common foods (kcal per 100g).
export const LOCAL_FOODS: LocalFood[] = [
  { name: 'Apple', emoji: '🍎', kcalPer100g: 52 },
  { name: 'Banana', emoji: '🍌', kcalPer100g: 89 },
  { name: 'Orange', emoji: '🍊', kcalPer100g: 47 },
  { name: 'Strawberries', emoji: '🍓', kcalPer100g: 32 },
  { name: 'Blueberries', emoji: '🫐', kcalPer100g: 57 },
  { name: 'Grapes', emoji: '🍇', kcalPer100g: 69 },
  { name: 'Pear', emoji: '🍐', kcalPer100g: 57 },
  { name: 'Peach', emoji: '🍑', kcalPer100g: 39 },
  { name: 'Pineapple', emoji: '🍍', kcalPer100g: 50 },
  { name: 'Mango', emoji: '🥭', kcalPer100g: 60 },
  { name: 'Watermelon', emoji: '🍉', kcalPer100g: 30 },
  { name: 'Lemon', emoji: '🍋', kcalPer100g: 29 },
  { name: 'Avocado', emoji: '🥑', kcalPer100g: 160 },
  { name: 'Tomato', emoji: '🍅', kcalPer100g: 18 },
  { name: 'Potato', emoji: '🥔', kcalPer100g: 77 },
  { name: 'Sweet Potato', emoji: '🍠', kcalPer100g: 86 },
  { name: 'Carrot', emoji: '🥕', kcalPer100g: 41 },
  { name: 'Broccoli', emoji: '🥦', kcalPer100g: 34 },
  { name: 'Spinach', emoji: '🥬', kcalPer100g: 23 },
  { name: 'Lettuce', emoji: '🥬', kcalPer100g: 15 },
  { name: 'Cucumber', emoji: '🥒', kcalPer100g: 15 },
  { name: 'Bell Pepper', emoji: '🫑', kcalPer100g: 31 },
  { name: 'Onion', emoji: '🧅', kcalPer100g: 40 },
  { name: 'Garlic', emoji: '🧄', kcalPer100g: 149 },
  { name: 'Mushrooms', emoji: '🍄', kcalPer100g: 22 },
  { name: 'Corn', emoji: '🌽', kcalPer100g: 86 },
  { name: 'Peas', emoji: '🟢', kcalPer100g: 81 },
  { name: 'Green Beans', emoji: '🫛', kcalPer100g: 31 },
  { name: 'Eggplant', emoji: '🍆', kcalPer100g: 25 },
  { name: 'Zucchini', emoji: '🥒', kcalPer100g: 17 },
  { name: 'Cauliflower', emoji: '🥦', kcalPer100g: 25 },
  { name: 'Cabbage', emoji: '🥬', kcalPer100g: 25 },
  { name: 'Celery', emoji: '🥬', kcalPer100g: 16 },
  { name: 'Chicken Breast', emoji: '🍗', kcalPer100g: 165 },
  { name: 'Chicken Thigh', emoji: '🍗', kcalPer100g: 209 },
  { name: 'Ground Beef', emoji: '🥩', kcalPer100g: 250 },
  { name: 'Steak', emoji: '🥩', kcalPer100g: 271 },
  { name: 'Pork Chop', emoji: '🥩', kcalPer100g: 231 },
  { name: 'Salmon', emoji: '🐟', kcalPer100g: 208 },
  { name: 'Tuna', emoji: '🐟', kcalPer100g: 132 },
  { name: 'Shrimp', emoji: '🦐', kcalPer100g: 99 },
  { name: 'Eggs', emoji: '🥚', kcalPer100g: 143 },
  { name: 'Milk', emoji: '🥛', kcalPer100g: 42 },
  { name: 'Greek Yogurt', emoji: '🥛', kcalPer100g: 59 },
  { name: 'Cheddar Cheese', emoji: '🧀', kcalPer100g: 402 },
  { name: 'Butter', emoji: '🧈', kcalPer100g: 717 },
  { name: 'White Rice', emoji: '🍚', kcalPer100g: 130 },
  { name: 'Brown Rice', emoji: '🍚', kcalPer100g: 123 },
  { name: 'Pasta', emoji: '🍝', kcalPer100g: 131 },
  { name: 'Bread', emoji: '🍞', kcalPer100g: 265 },
  { name: 'Oats', emoji: '🌾', kcalPer100g: 379 },
  { name: 'Quinoa', emoji: '🌾', kcalPer100g: 120 },
  { name: 'Flour', emoji: '🌾', kcalPer100g: 364 },
  { name: 'Sugar', emoji: '🍬', kcalPer100g: 387 },
  { name: 'Olive Oil', emoji: '🫒', kcalPer100g: 884 },
  { name: 'Almonds', emoji: '🌰', kcalPer100g: 579 },
  { name: 'Peanut Butter', emoji: '🥜', kcalPer100g: 588 },
  { name: 'Black Beans', emoji: '🫘', kcalPer100g: 132 },
  { name: 'Chickpeas', emoji: '🫘', kcalPer100g: 164 },
  { name: 'Lentils', emoji: '🫘', kcalPer100g: 116 },
  { name: 'Tofu', emoji: '⬜', kcalPer100g: 76 },
  { name: 'Honey', emoji: '🍯', kcalPer100g: 304 },
  { name: 'Dark Chocolate', emoji: '🍫', kcalPer100g: 546 },
]

const MAX_RESULTS = 8

export function searchLocalFoods(query: string): FoodSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matched = LOCAL_FOODS.filter((f) => f.name.toLowerCase().includes(q))
  matched.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1
    const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1
    if (ap !== bp) return ap - bp
    return a.name.localeCompare(b.name)
  })
  return matched.slice(0, MAX_RESULTS).map((f) => ({ ...f, source: 'local' as const }))
}
```

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/foods.test.ts` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/foods.ts __tests__/foods.test.ts
git commit -m "feat: add curated local food list with substring search"
```

---

## Task 3: OFF name search (`searchProductsByName`)

**Files:** Modify `src/services/foodApi.ts`; Test `__tests__/foodApi.test.ts`.

Reuse the existing quantity parsing. First refactor the inline logic in `lookupProductByBarcode` into a shared helper so both functions agree.

- [ ] **Step 1: Write failing tests** — append to `__tests__/foodApi.test.ts`:
```ts
import { searchProductsByName } from '../src/services/foodApi'

describe('searchProductsByName', () => {
  it('hits the OFF search endpoint with search_terms + User-Agent and maps hits', async () => {
    const fetchMock = fakeFetch({
      products: [
        { product_name: 'Hummus', quantity: '200 g', nutriments: { 'energy-kcal_100g': 166 } },
        { product_name: 'No Energy', nutriments: {} },
        { product_name: '', nutriments: { 'energy-kcal_100g': 100 } },
      ],
    })
    const out = await searchProductsByName('hummus', { fetch: fetchMock })
    const [url, opts] = (fetchMock as jest.Mock).mock.calls[0]
    expect(url).toContain('search_terms=hummus')
    expect(opts.headers['User-Agent']).toBe(OFF_USER_AGENT)
    expect(out).toEqual([
      { name: 'Hummus', emoji: '🛒', kcalPer100g: 166, packageWeightG: 200, source: 'off' },
    ])
  })

  it('returns [] when the response is not ok', async () => {
    expect(await searchProductsByName('x', { fetch: fakeFetch({}, false) })).toEqual([])
  })

  it('returns [] on a network/parse error', async () => {
    const fetchMock = jest.fn(async () => { throw new Error('down') }) as unknown as typeof fetch
    expect(await searchProductsByName('x', { fetch: fetchMock })).toEqual([])
  })
})
```
(`fakeFetch` and `OFF_USER_AGENT` are already imported at the top of this test file.)

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/foodApi.test.ts` → new cases FAIL.

- [ ] **Step 3: Implement** in `src/services/foodApi.ts`. Add `FoodSuggestion` import and a shared parser; add the search function. Concretely:

At the top, import the suggestion type:
```ts
import { FoodSuggestion } from '../foods'
```
Add a shared package-weight parser (place near the existing `parseQuantityG` helper — reuse it; if `parseQuantityG` already exists from the earlier pack-size work, call it here too):
```ts
function packageWeightFrom(p: any): number | undefined {
  const numeric = parseFloat(p?.product_quantity)
  if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric)
  const fromStr = parseQuantityG(p?.quantity)
  return fromStr ?? undefined
}
```
Add the search endpoint + function:
```ts
const SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl'
const SEARCH_FIELDS = 'product_name,product_quantity,quantity,nutriments'

export async function searchProductsByName(
  query: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<FoodSuggestion[]> {
  try {
    const url =
      `${SEARCH_BASE}?search_terms=${encodeURIComponent(query)}` +
      `&json=1&page_size=20&fields=${SEARCH_FIELDS}`
    const res = await deps.fetch(url, { headers: { 'User-Agent': OFF_USER_AGENT } })
    if (!res.ok) return []
    const json: any = await res.json()
    const products: any[] = Array.isArray(json?.products) ? json.products : []
    const out: FoodSuggestion[] = []
    for (const p of products) {
      const kcalPer100g = p?.nutriments?.['energy-kcal_100g']
      const name = typeof p?.product_name === 'string' ? p.product_name.trim() : ''
      if (typeof kcalPer100g !== 'number' || kcalPer100g <= 0 || !name) continue
      out.push({
        name,
        emoji: '🛒',
        kcalPer100g,
        packageWeightG: packageWeightFrom(p),
        source: 'off',
      })
    }
    return out
  } catch {
    return []
  }
}
```
> Note: `encodeURIComponent('hummus')` is `'hummus'`, so `search_terms=hummus` matches the test. If `lookupProductByBarcode` still inlines its own weight logic, refactor it to call `packageWeightFrom(p)` so both paths agree (keep its existing tests green). When `packageWeightFrom` returns `undefined`, omit `packageWeightG` from the object only if a test requires its absence — the Hummus case includes it (200), and the mapping above always sets the key (value may be `undefined`). To exactly match `toEqual` with the key present and numeric, the Hummus hit has a weight so this passes; for hits without weight the key is `undefined` which `toEqual` treats as present-undefined — acceptable since no test asserts a weightless OFF hit's exact shape.

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/foodApi.test.ts` → PASS (old + new). `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/services/foodApi.ts __tests__/foodApi.test.ts
git commit -m "feat: add Open Food Facts name search (searchProductsByName)"
```

---

## Task 4: `useFoodSearch` hook (local instant + debounced OFF)

**Files:** Create `src/hooks/useFoodSearch.ts`, `__tests__/useFoodSearch.test.tsx`.

- [ ] **Step 1: Write failing test** `__tests__/useFoodSearch.test.tsx` (uses `@testing-library/react-native`'s `renderHook` + fake timers; mock the OFF call):
```tsx
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useFoodSearch } from '../src/hooks/useFoodSearch'
import * as foodApi from '../src/services/foodApi'

jest.useFakeTimers()

afterEach(() => {
  jest.clearAllMocks()
})

describe('useFoodSearch', () => {
  it('returns local matches synchronously and no OFF call for short queries', () => {
    const spy = jest.spyOn(foodApi, 'searchProductsByName')
    const { result } = renderHook(() => useFoodSearch('a'))
    // length-1 query: local only, OFF not called
    expect(result.current.suggestions.length).toBeGreaterThan(0)
    expect(spy).not.toHaveBeenCalled()
  })

  it('appends debounced OFF results, deduped (local wins)', async () => {
    jest.spyOn(foodApi, 'searchProductsByName').mockResolvedValue([
      { name: 'Apple', emoji: '🛒', kcalPer100g: 52, source: 'off' }, // dupe of local Apple
      { name: 'Apple Juice', emoji: '🛒', kcalPer100g: 46, source: 'off' },
    ])
    const { result } = renderHook(() => useFoodSearch('apple'))
    // local present immediately
    expect(result.current.suggestions.some((s) => s.source === 'local')).toBe(true)
    await act(async () => {
      jest.advanceTimersByTime(350)
    })
    await waitFor(() => {
      expect(result.current.suggestions.some((s) => s.name === 'Apple Juice')).toBe(true)
    })
    // "Apple" appears once (local wins over the OFF dupe)
    const apples = result.current.suggestions.filter((s) => s.name.toLowerCase() === 'apple')
    expect(apples).toHaveLength(1)
    expect(apples[0].source).toBe('local')
  })

  it('returns [] for an empty query and makes no OFF call', () => {
    const spy = jest.spyOn(foodApi, 'searchProductsByName')
    const { result } = renderHook(() => useFoodSearch(''))
    expect(result.current.suggestions).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/useFoodSearch.test.tsx` → FAIL (module missing).

- [ ] **Step 3: Implement** `src/hooks/useFoodSearch.ts`:
```ts
import { useEffect, useMemo, useRef, useState } from 'react'
import { FoodSuggestion, searchLocalFoods } from '../foods'
import { searchProductsByName } from '../services/foodApi'

const DEBOUNCE_MS = 300
const MIN_OFF_LEN = 2

export function useFoodSearch(query: string): {
  suggestions: FoodSuggestion[]
  loading: boolean
} {
  const local = useMemo(() => searchLocalFoods(query), [query])
  const [off, setOff] = useState<FoodSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    setOff([])
    if (q.length < MIN_OFF_LEN) {
      setLoading(false)
      return
    }
    const token = ++tokenRef.current
    setLoading(true)
    const timer = setTimeout(async () => {
      const results = await searchProductsByName(q)
      if (token !== tokenRef.current) return // stale
      setOff(results)
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const suggestions = useMemo(() => {
    const seen = new Set(local.map((s) => s.name.toLowerCase()))
    const merged = [...local]
    for (const s of off) {
      const key = s.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(s)
    }
    return merged
  }, [local, off])

  return { suggestions, loading }
}
```

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/useFoodSearch.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/hooks/useFoodSearch.ts __tests__/useFoodSearch.test.tsx
git commit -m "feat: add useFoodSearch hook merging local + debounced OFF results"
```

---

## Task 5: Unified Add item sheet (autofill + editable weight + quantity)

**Files:** Modify `src/components/AddItemSheet.tsx`; Test `__tests__/AddItemSheet.test.tsx`.

Read the current `AddItemSheet.tsx` first. The new sheet keeps the `{ visible, product, onAdd, onClose }` props but reworks the body. Behaviour:
- **Scanned** (`product != null`): name read-only; `kcalPer100g` = `product.kcalPer100g`; weight prefilled with `product.packageWeightG` but **editable**; emoji from product.
- **Manual** (`product == null`): name is an input feeding `useFoodSearch`; a dropdown shows suggestions; tapping one fills name + `kcalPer100g` (+ weight if `packageWeightG`) + emoji and closes the dropdown. Typing in the name field clears any picked `kcalPer100g` (back to free entry).
- **Quantity** stepper (min 1, default 1), multiplies the calorie preview/total only.
- **Calories:** when an effective kcal/100g exists, show read-only preview `kcalForWeight(per100, weight)` (and `× qty` total when qty>1). When manual with no kcal/100g, show an editable **"Calories per 100g"** input.

- [ ] **Step 1: Write failing tests** — replace/extend `__tests__/AddItemSheet.test.tsx`. Keep existing passing assertions where still valid; add. **Mock the OFF call** so the hook's debounce never hits the network:
```tsx
import React from 'react'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'

// AddItemSheet -> useFoodSearch -> searchProductsByName. Stub the OFF call;
// the real local search still runs. (foodApi's other exports are unused here.)
jest.mock('../src/services/foodApi', () => ({
  searchProductsByName: jest.fn().mockResolvedValue([]),
}))

import AddItemSheet from '../src/components/AddItemSheet'
import { Product } from '../src/mockProducts'

const product: Product = { name: 'Nutella', emoji: '🍫', packageWeightG: 400, kcalPer100g: 539 }

describe('AddItemSheet — scanned mode', () => {
  it('prefills the editable weight and emits quantity + per-unit kcal', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={product} onAdd={onAdd} onClose={() => {}} />
    )
    const weight = getByTestId('weight-input')
    expect(weight.props.value).toBe('400')             // prefilled, editable
    fireEvent.changeText(weight, '200')                // user corrects size
    fireEvent.press(getByTestId('qty-increment'))      // qty 1 -> 2
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nutella',
        weightG: 200,
        kcal: 1078,        // kcalForWeight(539, 200) = 1078, per-unit (NOT × qty)
        quantity: 2,
        source: 'barcode',
      })
    )
  })
})

describe('AddItemSheet — manual mode', () => {
  it('autofills name + kcal from a tapped local suggestion', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    fireEvent.changeText(getByTestId('weight-input'), '120')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Banana',
        weightG: 120,
        kcal: 107,         // kcalForWeight(89, 120) ≈ 107
        quantity: 1,
        source: 'manual',
      })
    )
  })

  it('shows a calories-per-100g field for a free item with no match and uses it', () => {
    const onAdd = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Grandmas Stew')
    const per100 = getByTestId('kcal-per-100g-input')   // appears for free items
    expect(per100).toBeTruthy()
    fireEvent.changeText(per100, '150')
    fireEvent.changeText(getByTestId('weight-input'), '300')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Grandmas Stew', weightG: 300, kcal: 450, quantity: 1 })
    )
    expect(queryByTestId('manual-kcal-input')).toBeNull() // old total-kcal field is gone
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/AddItemSheet.test.tsx` → FAIL.

- [ ] **Step 3: Implement** `src/components/AddItemSheet.tsx`:
```tsx
import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet,
} from 'react-native'
import { Product } from '../mockProducts'
import { FoodItem } from '../types'
import { kcalForWeight } from '../utils/nutrition'
import { useFoodSearch } from '../hooks/useFoodSearch'
import { FoodSuggestion } from '../foods'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  product: Product | null
  onAdd: (item: FoodItem) => void
  onClose: () => void
}

export default function AddItemSheet({ visible, product, onAdd, onClose }: Props) {
  const isManual = product === null
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [qty, setQty] = useState(1)
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [manualKcal100, setManualKcal100] = useState('')
  const [emoji, setEmoji] = useState('🛒')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setWeight(String(product.packageWeightG))
      setKcalPer100g(product.kcalPer100g)
      setEmoji(product.emoji)
    } else {
      setName('')
      setWeight('')
      setKcalPer100g(null)
      setEmoji('🛒')
    }
    setQty(1)
    setManualKcal100('')
    setDropdownOpen(false)
  }, [product, visible])

  // Manual-mode live search (no-op string when scanned -> empty results).
  const { suggestions } = useFoodSearch(isManual && dropdownOpen ? name : '')

  function handleNameChange(text: string) {
    setName(text)
    setKcalPer100g(null) // free typing => fall back to manual kcal/100g
    setEmoji('🛒')
    setDropdownOpen(true)
  }

  function pick(s: FoodSuggestion) {
    setName(s.name)
    setKcalPer100g(s.kcalPer100g)
    setEmoji(s.emoji)
    if (s.packageWeightG) setWeight(String(s.packageWeightG))
    setDropdownOpen(false)
    Keyboard.dismiss()
  }

  const effectivePer100g =
    kcalPer100g ?? (parseFloat(manualKcal100) > 0 ? parseFloat(manualKcal100) : null)
  const weightNum = parseInt(weight, 10) || 0
  const perUnitKcal = effectivePer100g != null ? kcalForWeight(effectivePer100g, weightNum) : 0
  const showManualPer100 = isManual && kcalPer100g == null

  function handleAdd() {
    onAdd({
      name: name.trim() || 'Item',
      weightG: weightNum,
      kcal: perUnitKcal,
      emoji,
      quantity: qty,
      source: product ? 'barcode' : 'manual',
    })
    Keyboard.dismiss()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="add-item-sheet">
              <Text style={styles.title}>{isManual ? 'Add item' : name}</Text>
              {!isManual && <Text style={styles.emoji}>{emoji}</Text>}

              {isManual && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    testID="manual-name-input"
                    style={styles.input}
                    placeholder="Search food (e.g. banana)"
                    value={name}
                    onChangeText={handleNameChange}
                    returnKeyType="done"
                  />
                  {dropdownOpen && suggestions.length > 0 && (
                    <ScrollView
                      style={styles.dropdown}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={`${s.source}-${s.name}-${i}`}
                          testID="suggestion-row"
                          style={styles.suggestion}
                          onPress={() => pick(s)}
                        >
                          <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                          <Text style={styles.suggestionName}>{s.name}</Text>
                          <Text style={styles.suggestionKcal}>
                            {s.kcalPer100g} kcal/100g{s.source === 'off' ? '  · OFF' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              <Text style={styles.fieldLabel}>Weight (g)</Text>
              <TextInput
                testID="weight-input"
                style={styles.input}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                returnKeyType="done"
              />

              {showManualPer100 && (
                <>
                  <Text style={styles.fieldLabel}>Calories (per 100g)</Text>
                  <TextInput
                    testID="kcal-per-100g-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={manualKcal100}
                    onChangeText={setManualKcal100}
                    returnKeyType="done"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Quantity</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  testID="qty-decrement"
                  style={styles.qtyBtn}
                  onPress={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text testID="qty-value" style={styles.qtyValue}>{qty}</Text>
                <TouchableOpacity
                  testID="qty-increment"
                  style={styles.qtyBtn}
                  onPress={() => setQty((q) => q + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.summary} testID="kcal-preview">
                {qty > 1
                  ? `${perUnitKcal} kcal × ${qty} = ${perUnitKcal * qty} kcal`
                  : `${perUnitKcal} kcal`}
              </Text>

              <TouchableOpacity testID="add-item-button" style={styles.addBtn} onPress={handleAdd}>
                <Text style={styles.addBtnText}>Add to period</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-button" style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.kcalText },
  emoji: { fontSize: 44, marginVertical: 8 },
  summary: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginTop: 12 },
  fieldBlock: { width: '100%' },
  fieldLabel: {
    alignSelf: 'flex-start', fontSize: 13, color: colors.monthText, marginTop: 12, marginBottom: 4,
  },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  dropdown: {
    width: '100%', maxHeight: 180, borderWidth: 1, borderColor: '#EEEEEE',
    borderRadius: 10, marginTop: 4,
  },
  suggestion: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  suggestionEmoji: { fontSize: 20, marginRight: 10 },
  suggestionName: { flex: 1, fontSize: 15, color: colors.kcalText },
  suggestionKcal: { fontSize: 12, color: colors.monthText },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.itemCard,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 24, fontWeight: '600', color: colors.kcalText },
  qtyValue: { fontSize: 18, fontWeight: '700', color: colors.kcalText, marginHorizontal: 20, minWidth: 24, textAlign: 'center' },
  addBtn: {
    width: '100%', backgroundColor: colors.selectedDay, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, marginTop: 4 },
  cancelText: { color: colors.monthText, fontSize: 15 },
})
```
> The old manual flow's `manual-kcal-input` (total kcal) is intentionally removed; the free-item test asserts it's gone. The `product-weight` summary Text is replaced by the editable `weight-input`. If any existing test referenced `product-weight`/`manual-kcal-input`, update those assertions to the new fields in Step 1.

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/AddItemSheet.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: unified add sheet with autofill, editable weight, quantity"
```

---

## Task 6: Manual-add entry points (FAB + New-shop panel + App)

**Files:** Modify `src/components/AddFab.tsx`, `src/components/NewPeriodPanel.tsx`, `App.tsx`; Tests `__tests__/AddFab.test.tsx`, `__tests__/NewPeriodPanel.test.tsx`.

- [ ] **Step 1: Write failing tests.**
Append to `__tests__/AddFab.test.tsx`:
```tsx
it('fires onAddManual from the manual option', () => {
  const onAddManual = jest.fn()
  const { getByTestId } = render(
    <AddFab onScanBarcode={() => {}} onScanReceipt={() => {}} onAddManual={onAddManual} />
  )
  fireEvent.press(getByTestId('add-fab'))       // open menu
  fireEvent.press(getByTestId('fab-manual'))
  expect(onAddManual).toHaveBeenCalled()
})
```
Append to `__tests__/NewPeriodPanel.test.tsx`:
```tsx
it('fires onAddManual when the manual-add control is pressed', () => {
  const onAddManual = jest.fn()
  const { getByTestId } = render(
    <NewPeriodPanel dayCount={4} onDaysChange={() => {}} onScanBarcode={() => {}}
      onScanReceipt={() => {}} onAddManual={onAddManual} />
  )
  fireEvent.press(getByTestId('manual-add'))
  expect(onAddManual).toHaveBeenCalled()
})
```
**Required:** `onAddManual` is a required prop below, so update EVERY existing render call in BOTH `__tests__/AddFab.test.tsx` and `__tests__/NewPeriodPanel.test.tsx` to pass `onAddManual={() => {}}` (or a jest.fn) — otherwise `npx tsc --noEmit` fails on the test files.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement.**
`AddFab.tsx`: add `onAddManual: () => void` to `Props`, and a third menu option **above** the existing two:
```tsx
          <TouchableOpacity testID="fab-manual" style={styles.option} onPress={() => choose(onAddManual)}>
            <Text style={styles.optionText}>Add Manually</Text>
          </TouchableOpacity>
```
`NewPeriodPanel.tsx`: add `onAddManual: () => void` to `Props`, and below the `scanRow` add:
```tsx
      <TouchableOpacity testID="manual-add" style={styles.manualLink} onPress={onAddManual}>
        <Text style={styles.manualLinkText}>+ Add manually</Text>
      </TouchableOpacity>
```
and styles:
```tsx
  manualLink: { marginTop: 16, paddingVertical: 8 },
  manualLinkText: { fontSize: 15, fontWeight: '600', color: colors.selectedDay },
```
`App.tsx`: add a handler and pass it to both:
```tsx
  function handleAddManual() {
    setSheetProduct(null)
    setSheetVisible(true)
  }
```
Pass `onAddManual={handleAddManual}` to both `<NewPeriodPanel .../>` and `<AddFab .../>`.

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/AddFab.test.tsx __tests__/NewPeriodPanel.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/components/AddFab.tsx src/components/NewPeriodPanel.tsx App.tsx __tests__/AddFab.test.tsx __tests__/NewPeriodPanel.test.tsx
git commit -m "feat: add manual-add entry points to FAB and new-shop panel"
```

---

## Task 7: Delete confirmation dialog

**Files:** Modify `App.tsx`; Test `__tests__/App.manualAndDelete.test.tsx`.

`handleRemoveItem` currently removes immediately. Wrap it in `Alert.alert`; the actual removal moves into the destructive button's `onPress`.

- [ ] **Step 1: Write failing test** `__tests__/App.manualAndDelete.test.tsx`:
```tsx
import React from 'react'
import { Alert } from 'react-native'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  simulateReceiptScan: jest.fn(),
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-02'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

describe('delete confirmation', () => {
  it('keeps the item when the dialog is cancelled and removes it when confirmed', async () => {
    const { getAllByTestId, findAllByTestId } = render(<App />)
    const rows = await findAllByTestId('food-item')
    const count = rows.length

    // Cancel: spy invokes the cancel button (index 0) -> no removal
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, btns) => {
      btns?.[0]?.onPress?.()
    })
    fireEvent.press(within(rows[0]).getByTestId('remove-item'))
    expect(getAllByTestId('food-item')).toHaveLength(count)

    // Confirm: spy invokes the destructive button (index 1) -> removed
    alertSpy.mockImplementation((_t, _m, btns) => { btns?.[1]?.onPress?.() })
    fireEvent.press(within(rows[0]).getByTestId('remove-item'))
    await waitFor(() => expect(getAllByTestId('food-item')).toHaveLength(count - 1))
  })
})
```

- [ ] **Step 2: Run, verify fail.** Removal happens without confirm → cancel case fails (count drops).

> **Also update the existing removal test** in `__tests__/App.addToCycle.test.tsx` ("removes a stocked item when its remove control is tapped"): deletion now requires confirmation, so before pressing `remove-item` add `jest.spyOn(Alert, 'alert').mockImplementation((_t,_m,btns) => btns?.[1]?.onPress?.())` (import `Alert` from `react-native`) to auto-confirm. Without this, that test regresses because the tap only opens the (unmocked) dialog.

- [ ] **Step 3: Implement** in `App.tsx`. Add `Alert` to the `react-native` import. Replace `handleRemoveItem`:
```tsx
  function handleRemoveItem(index: number) {
    Alert.alert('Remove item', 'Remove this item from the period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setCycles((prev) =>
            prev.map((c) =>
              c.id === activeCycleId
                ? { ...c, items: c.items.filter((_, i) => i !== index) }
                : c
            )
          ),
      },
    ])
  }
```

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/App.manualAndDelete.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add App.tsx __tests__/App.manualAndDelete.test.tsx
git commit -m "feat: confirm before deleting a stocked item"
```

---

## Task 8: Quantity-aware item display

**Files:** Modify `src/components/MealPrepDetail.tsx`; Test `__tests__/MealPrepDetail.test.tsx`.

- [ ] **Step 1: Write failing test** — append to `__tests__/MealPrepDetail.test.tsx`:
```tsx
it('shows a ×N badge and quantity-multiplied calories', () => {
  const cycle = {
    id: 'c', startDate: '2026-06-01', endDate: '2026-06-04',
    items: [{ name: 'Chicken', weightG: 200, kcal: 220, emoji: '🍗', quantity: 3 }],
  }
  const { getByText } = render(<MealPrepDetail activeCycle={cycle} />)
  getByText(/×3/)              // quantity badge
  getByText(/660kcal/)         // 220 × 3, weight stays per-unit (200g)
  getByText(/200g/)
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** in `src/components/MealPrepDetail.tsx`. Update the meta line:
```tsx
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.name}
                {(item.quantity ?? 1) > 1 ? `  ×${item.quantity}` : ''}
              </Text>
              <Text style={styles.meta}>
                {item.weightG}g  {item.kcal * (item.quantity ?? 1)}kcal
              </Text>
            </View>
```
(Leave the existing `remove-item` control and styles intact.)

- [ ] **Step 4: Run, verify pass.** `npx jest __tests__/MealPrepDetail.test.tsx` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/components/MealPrepDetail.tsx __tests__/MealPrepDetail.test.tsx
git commit -m "feat: show quantity badge and quantity-multiplied calories"
```

---

## Final verification (executor self-review)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx jest` — full suite green (existing 73 + new: nutrition, foods, foodApi search, useFoodSearch, AddItemSheet, AddFab, NewPeriodPanel, App.manualAndDelete, MealPrepDetail)
- [ ] `npx expo export --platform ios --output-dir /tmp/mvp2-ios && npx expo export --platform web --output-dir /tmp/mvp2-web` both succeed; then `rm -rf /tmp/mvp2-ios /tmp/mvp2-web`
- [ ] **No `expo start`** run; no test imports the camera / `scan.ts` (App tests mock `../src/services/scan`)
- [ ] Barcode scan still feeds the (now editable) sheet; receipt flow untouched
- [ ] Device note (human): autofill dropdown, quantity stepper, editable scanned weight, and the delete dialog are best confirmed on a physical phone via Expo Go.
```
