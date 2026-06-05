# Extra Meals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Extra" pills interactive: a faint ＋ pill on every empty day, one solid pill per day with extras, a bottom-¾ extra-meal mode (reusing the detail layout) with a manual-only ＋ that opens a tiny description+calories sheet, tap-to-remove, persistence, and a stacked green-meal-prep / pink-extras BudgetBar.

**Architecture:** Extras stay `ExtraMeal { id, date, name, kcal }`, move from a static import into `App` state, and persist via AsyncStorage. A new `activeExtraDate` selects extra mode. New small components `ExtraMealDetail` + `ExtraMealSheet`; `BudgetBar`, `CalendarStrip`, and `AddFab` are enhanced in place.

**Tech Stack:** Expo SDK 54, RN 0.81, TypeScript, Jest + @testing-library/react-native. Spec: `docs/superpowers/specs/2026-06-05-extra-meals-design.md`.

**Hard constraints:** TDD red→green→commit. `npx tsc --noEmit` clean and full `npx jest` green after every task. NEVER run `npx expo start` — use `npx expo export` for bundle checks. Keep camera/`scan.ts`/native out of the jest graph (mock `Alert`; AsyncStorage is already globally mocked in `jest-setup.js`).

---

## File Structure
- `src/utils/nutrition.ts` — **modify**: add `extrasKcalInRange`, `extrasKcalOnDate`.
- `src/services/storage.ts` — **modify**: add `loadExtras`/`saveExtras` (`basket:extras:v1`).
- `src/components/BudgetBar.tsx` — **modify**: stacked green+pink, new props.
- `src/styles/colors.ts` — **modify**: add `extraPillFaint`, `extraPillFaintText`.
- `src/components/CalendarStrip.tsx` — **modify**: faint `add-extra` pill + tappable solid `extra-pill`.
- `src/components/ExtraMealSheet.tsx` — **create**: description + calories modal.
- `src/components/ExtraMealDetail.tsx` — **create**: day's extras list + remove.
- `src/components/AddFab.tsx` — **modify**: `manualOnly` prop.
- `App.tsx` — **modify**: extras state/persistence, `activeExtraDate`, handlers, extra-mode render, new BudgetBar props.
- Tests: matching `__tests__/*.test.ts(x)` + new `__tests__/App.extras.test.tsx`.

---

## Task 1: Nutrition helpers for extra calories

**Files:** Modify `src/utils/nutrition.ts`; Test `__tests__/nutrition.test.ts`.

- [ ] **Step 1: Write failing tests** — append to `__tests__/nutrition.test.ts`:
```ts
import { extrasKcalInRange, extrasKcalOnDate } from '../src/utils/nutrition'
import { ExtraMeal } from '../src/types'

const extras: ExtraMeal[] = [
  { id: 'a', date: '2026-06-02', name: 'Bar', kcal: 220 },
  { id: 'b', date: '2026-06-03', name: 'Coffee', kcal: 90 },
  { id: 'c', date: '2026-06-03', name: 'Cake', kcal: 400 },
  { id: 'd', date: '2026-06-10', name: 'Pizza', kcal: 800 },
]

describe('extrasKcalInRange', () => {
  it('sums kcal of extras with date within [start, end] inclusive', () => {
    expect(extrasKcalInRange(extras, '2026-06-01', '2026-06-04')).toBe(710) // a+b+c
  })
  it('returns 0 when none fall in range', () => {
    expect(extrasKcalInRange(extras, '2026-07-01', '2026-07-31')).toBe(0)
  })
})

describe('extrasKcalOnDate', () => {
  it('sums kcal of extras on an exact date', () => {
    expect(extrasKcalOnDate(extras, '2026-06-03')).toBe(490) // b+c
  })
  it('returns 0 for a date with no extras', () => {
    expect(extrasKcalOnDate(extras, '2026-06-09')).toBe(0)
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/nutrition.test.ts`

- [ ] **Step 3: Implement** — append to `src/utils/nutrition.ts` (add `ExtraMeal` to the existing `import { FoodItem } from '../types'` → `import { FoodItem, ExtraMeal } from '../types'`):
```ts
export function extrasKcalInRange(extras: ExtraMeal[], start: string, end: string): number {
  return extras.reduce(
    (sum, e) => (e.date >= start && e.date <= end ? sum + e.kcal : sum),
    0
  )
}

export function extrasKcalOnDate(extras: ExtraMeal[], date: string): number {
  return extras.reduce((sum, e) => (e.date === date ? sum + e.kcal : sum), 0)
}
```
(ISO `YYYY-MM-DD` strings compare correctly with `>=`/`<=`.)

- [ ] **Step 4: Verify.** `npx jest __tests__/nutrition.test.ts` passes; full `npx jest` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
```bash
git add src/utils/nutrition.ts __tests__/nutrition.test.ts
git commit -m "feat: add extrasKcalInRange/extrasKcalOnDate helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Persist extra meals

**Files:** Modify `src/services/storage.ts`; Test `__tests__/storage.test.ts`.

Read `src/services/storage.ts` first — mirror the existing `loadCycles`/`saveCycles` exactly.

- [ ] **Step 1: Write failing tests** — append to `__tests__/storage.test.ts` (it already has an in-memory fake-storage helper; reuse that style):
```ts
import { loadExtras, saveExtras, STORAGE_KEY_EXTRAS } from '../src/services/storage'
import { ExtraMeal } from '../src/types'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v }),
    _store: store,
  }
}

describe('extras storage', () => {
  const extras: ExtraMeal[] = [{ id: 'x', date: '2026-06-02', name: 'Bar', kcal: 220 }]

  it('round-trips saved extras', async () => {
    const storage = fakeStorage()
    await saveExtras(extras, { storage })
    expect(storage._store[STORAGE_KEY_EXTRAS]).toBeDefined()
    expect(await loadExtras({ storage })).toEqual(extras)
  })
  it('returns null when nothing is stored', async () => {
    expect(await loadExtras({ storage: fakeStorage() })).toBeNull()
  })
  it('returns null on corrupt JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_EXTRAS]: 'not json' })
    expect(await loadExtras({ storage })).toBeNull()
  })
  it('returns null on non-array JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_EXTRAS]: '{}' })
    expect(await loadExtras({ storage })).toBeNull()
  })
  it('saveExtras swallows setItem errors', async () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(async () => { throw new Error('full') }) }
    await expect(saveExtras(extras, { storage })).resolves.toBeUndefined()
  })
})
```
> If the existing `storage.test.ts` already defines a fake-storage helper, reuse it instead of redefining `fakeStorage` (avoid a duplicate-identifier tsc error). Match whatever the file already does.

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/storage.test.ts`

- [ ] **Step 3: Implement** in `src/services/storage.ts`. Add `ExtraMeal` to the types import, a new key, and the two functions mirroring the cycles ones:
```ts
export const STORAGE_KEY_EXTRAS = 'basket:extras:v1'

export async function loadExtras(
  deps: StorageDeps = defaultDeps
): Promise<ExtraMeal[] | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_EXTRAS)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ExtraMeal[]) : null
  } catch {
    return null
  }
}

export async function saveExtras(
  extras: ExtraMeal[],
  deps: StorageDeps = defaultDeps
): Promise<void> {
  try {
    await deps.storage.setItem(STORAGE_KEY_EXTRAS, JSON.stringify(extras))
  } catch {
    // Persistence must never crash the app.
  }
}
```
(Use the existing `StorageDeps` type and `defaultDeps` already in the file. Add `ExtraMeal` to the existing `import { MealPrepCycle } from '../types'`.)

- [ ] **Step 4: Verify.** `npx jest __tests__/storage.test.ts` passes; full `npx jest` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
```bash
git add src/services/storage.ts __tests__/storage.test.ts
git commit -m "feat: persist extra meals in AsyncStorage

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Stacked green + pink BudgetBar

**Files:** Modify `src/components/BudgetBar.tsx`, `src/styles/colors.ts`; Test `__tests__/BudgetBar.test.tsx`.

The bar gains a pink "extras" segment. **Props change** from `{ stockedKcal, budgetKcal }` to `{ mealPrepKcal, extraKcal, budgetKcal }`. The green segment keeps `testID="budget-bar-fill"`; pink is `testID="budget-bar-extra-fill"`.

- [ ] **Step 1: Replace the test file** `__tests__/BudgetBar.test.tsx`:
```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import BudgetBar from '../src/components/BudgetBar'

function widthOf(node: any): string {
  const flat = Array.isArray(node.props.style)
    ? Object.assign({}, ...node.props.style)
    : node.props.style
  return flat.width
}

describe('BudgetBar', () => {
  it('shows the combined total over budget', () => {
    const { getByText } = render(<BudgetBar mealPrepKcal={1000} extraKcal={500} budgetKcal={8000} />)
    expect(getByText('1500 / 8000 kcal')).toBeTruthy()
  })

  it('renders green meal-prep and pink extra segments at the right widths', () => {
    const { getByTestId } = render(<BudgetBar mealPrepKcal={2000} extraKcal={2000} budgetKcal={8000} />)
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('25%')        // 2000/8000
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('25%')  // 2000/8000
  })

  it('never lets the two segments exceed 100% combined', () => {
    const { getByTestId } = render(<BudgetBar mealPrepKcal={6000} extraKcal={5000} budgetKcal={8000} />)
    // green clamps to 75%, pink gets only the remaining 25%
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('75%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('25%')
  })

  it('renders a legend for both components', () => {
    const { getByText } = render(<BudgetBar mealPrepKcal={0} extraKcal={0} budgetKcal={2000} />)
    expect(getByText('Meal prep')).toBeTruthy()
    expect(getByText('Extra')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/BudgetBar.test.tsx`

- [ ] **Step 3a: Add colors** to `src/styles/colors.ts` (inside the object):
```ts
  extraPillFaint: '#F7D6E2',
  extraPillFaintText: '#C98AA6',
```

- [ ] **Step 3b: Implement** `src/components/BudgetBar.tsx`:
```tsx
import React from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  mealPrepKcal: number
  extraKcal: number
  budgetKcal: number
}

export default function BudgetBar({ mealPrepKcal, extraKcal, budgetKcal }: Props) {
  const budget = budgetKcal > 0 ? budgetKcal : 1
  const greenRatio = Math.min(mealPrepKcal, budget) / budget
  const pinkRatio = Math.min(extraKcal, Math.max(0, budget - mealPrepKcal)) / budget
  const greenPct: DimensionValue = `${Math.round(greenRatio * 100)}%`
  const pinkPct: DimensionValue = `${Math.round(pinkRatio * 100)}%`

  return (
    <View style={styles.container} testID="budget-bar">
      <Text style={styles.label}>
        {mealPrepKcal + extraKcal} / {budgetKcal} kcal
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, styles.green, { width: greenPct }]} testID="budget-bar-fill" />
        <View style={[styles.fill, styles.pink, { width: pinkPct }]} testID="budget-bar-extra-fill" />
      </View>
      <View style={styles.legend}>
        <View style={[styles.dot, styles.green]} />
        <Text style={styles.legendText}>Meal prep</Text>
        <View style={[styles.dot, styles.pink]} />
        <Text style={styles.legendText}>Extra</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.kcalText, marginBottom: 6 },
  track: {
    height: 10, borderRadius: 5, backgroundColor: '#FFFFFF',
    overflow: 'hidden', flexDirection: 'row',
  },
  fill: { height: '100%' },
  green: { backgroundColor: colors.cycleBar },
  pink: { backgroundColor: colors.extraPill },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 11, color: colors.monthText, marginRight: 12 },
})
```
Note: `styles.green`/`styles.pink` are shared by the fill segments and the legend dots (background color only), so combining them with `styles.fill` or `styles.dot` is intentional.

- [ ] **Step 4: Verify.** `npx jest __tests__/BudgetBar.test.tsx` passes. Then run the FULL suite — `App.tsx` still renders `<BudgetBar stockedKcal=… />` (old props) so **tsc will fail** until Task 8 fixes the call site. To keep this task self-contained and green, ALSO update the `App.tsx` BudgetBar call site now to the new props using the cycle-mode numbers (this is the minimal change needed to compile):
  - Find where `BudgetBar` is rendered in `App.tsx` and where `stockedKcal`/`budgetKcal` are computed.
  - Replace with: `mealPrepKcal={stockedKcal}` (keep the existing `stockedKcal = totalKcal(activeCycle.items)` computation), `extraKcal={0}` (real extras wiring lands in Task 8), `budgetKcal={budgetKcal}`.
  - This compiles and keeps current behavior (green only) until Task 8. `npx tsc --noEmit` clean; full `npx jest` green.

- [ ] **Step 5: Commit.**
```bash
git add src/components/BudgetBar.tsx src/styles/colors.ts __tests__/BudgetBar.test.tsx App.tsx
git commit -m "feat: stacked green meal-prep + pink extras BudgetBar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Calendar pills (faint add + tappable extra)

**Files:** Modify `src/components/CalendarStrip.tsx`; Test `__tests__/CalendarStrip.test.tsx`.

Read the current `CalendarStrip.tsx`. Today it renders an `extraPill` ("Extra") for `extraDates` and an empty `extraPlaceholder` otherwise. Make BOTH a tappable pill: solid for extra days, very-faint-with-＋ for empty days. New required props `onExtraPress: (date: string) => void` and optional `activeExtraDate?: string | null`.

- [ ] **Step 1: Write failing tests** — read the existing `__tests__/CalendarStrip.test.tsx` and update its render calls to include `onExtraPress`; then add:
```tsx
it('renders a faint add-extra pill on a day with no extra and fires onExtraPress', () => {
  const onExtraPress = jest.fn()
  const { getAllByTestId } = render(
    <CalendarStrip windowStart="2026-06-01" totalDays={3} today="2026-06-02"
      extraDates={['2026-06-02']} onExtraPress={onExtraPress} dayWidth={64} />
  )
  // 3 days, 1 has an extra -> 2 faint add pills
  const adds = getAllByTestId('add-extra')
  expect(adds).toHaveLength(2)
  fireEvent.press(adds[0])
  expect(onExtraPress).toHaveBeenCalledWith('2026-06-01')
})

it('renders exactly one solid extra-pill per day even with multiple extras and fires onExtraPress', () => {
  const onExtraPress = jest.fn()
  const { getAllByTestId } = render(
    <CalendarStrip windowStart="2026-06-01" totalDays={3} today="2026-06-02"
      extraDates={['2026-06-02', '2026-06-02']} onExtraPress={onExtraPress} dayWidth={64} />
  )
  const pills = getAllByTestId('extra-pill')
  expect(pills).toHaveLength(1) // de-duped to one per day
  fireEvent.press(pills[0])
  expect(onExtraPress).toHaveBeenCalledWith('2026-06-02')
})
```
Ensure `fireEvent` is imported from `@testing-library/react-native` in this test file.

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/CalendarStrip.test.tsx`

- [ ] **Step 3: Implement** in `src/components/CalendarStrip.tsx`:
  - Add `TouchableOpacity` to the `react-native` import.
  - Update `Props`: add `onExtraPress: (date: string) => void` and `activeExtraDate?: string | null`.
  - Build the extra-day set from `extraDates` (it already does `const extraSet = new Set(extraDates)` — that dedupes multiple extras on one date automatically).
  - Replace the `hasExtra ? <extraPill> : <extraPlaceholder>` block with:
```tsx
            {hasExtra ? (
              <TouchableOpacity
                testID="extra-pill"
                style={[styles.extraPill, date === activeExtraDate && styles.extraPillActive]}
                onPress={() => onExtraPress(date)}
              >
                <Text style={styles.extraText}>Extra</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="add-extra"
                style={styles.extraAdd}
                onPress={() => onExtraPress(date)}
              >
                <Text style={styles.extraAddText}>＋</Text>
              </TouchableOpacity>
            )}
```
  - Replace the `extraPlaceholder` style and add new styles (keep height 24 so date boxes stay aligned):
```tsx
  extraAdd: {
    backgroundColor: colors.extraPillFaint,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  extraAddText: { color: colors.extraPillFaintText, fontSize: 13, fontWeight: '600' },
  extraPillActive: { borderWidth: 2, borderColor: colors.extraPillText },
```
  (Keep the existing `extraPill`/`extraText` styles. Remove the now-unused `extraPlaceholder` style.)

- [ ] **Step 4: Verify.** `npx jest __tests__/CalendarStrip.test.tsx` passes. Full suite — `App.tsx` renders `<CalendarStrip ... />` WITHOUT `onExtraPress` now, so tsc fails. Add a minimal stub at the App call site to compile: pass `onExtraPress={() => {}}` for now (real handler in Task 8). `npx tsc --noEmit` clean; full `npx jest` green.

- [ ] **Step 5: Commit.**
```bash
git add src/components/CalendarStrip.tsx __tests__/CalendarStrip.test.tsx App.tsx
git commit -m "feat: tappable extra pills + faint add-extra affordance in calendar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: ExtraMealSheet (description + calories)

**Files:** Create `src/components/ExtraMealSheet.tsx`, `__tests__/ExtraMealSheet.test.tsx`.

A minimal modal mirroring `AddItemSheet`'s sheet chrome. Emits `{ name, kcal }`; Save is disabled until description non-empty and kcal > 0.

- [ ] **Step 1: Write failing test** `__tests__/ExtraMealSheet.test.tsx`:
```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ExtraMealSheet from '../src/components/ExtraMealSheet'

describe('ExtraMealSheet', () => {
  it('does not save until description and calories are valid', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(<ExtraMealSheet visible onSave={onSave} onClose={() => {}} />)
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.press(getByTestId('save-extra-button')) // kcal still empty
    expect(onSave).not.toHaveBeenCalled()
  })

  it('emits the description and calorie estimate on save', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(<ExtraMealSheet visible onSave={onSave} onClose={() => {}} />)
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '850')
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).toHaveBeenCalledWith({ name: 'Sushi with friends', kcal: 850 })
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/ExtraMealSheet.test.tsx`

- [ ] **Step 3: Implement** `src/components/ExtraMealSheet.tsx`:
```tsx
import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Keyboard, Platform, StyleSheet,
} from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  onSave: (draft: { name: string; kcal: number }) => void
  onClose: () => void
}

export default function ExtraMealSheet({ visible, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')

  useEffect(() => {
    setName('')
    setKcal('')
  }, [visible])

  const kcalNum = parseInt(kcal, 10) || 0
  const canSave = name.trim().length > 0 && kcalNum > 0

  function handleSave() {
    if (!canSave) return
    onSave({ name: name.trim(), kcal: kcalNum })
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
            <View style={styles.sheet} testID="extra-meal-sheet">
              <Text style={styles.title}>Add extra meal</Text>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                testID="extra-desc-input"
                style={styles.input}
                placeholder="e.g. Sushi with friends"
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Estimated calories</Text>
              <TextInput
                testID="extra-kcal-input"
                style={styles.input}
                keyboardType="numeric"
                value={kcal}
                onChangeText={setKcal}
                returnKeyType="done"
              />

              <TouchableOpacity
                testID="save-extra-button"
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveBtnText}>Save extra meal</Text>
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
    padding: 24, paddingBottom: 36,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, alignSelf: 'center' },
  fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.selectedDay, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
  cancelText: { color: colors.monthText, fontSize: 15 },
})
```

- [ ] **Step 4: Verify.** `npx jest __tests__/ExtraMealSheet.test.tsx` passes; full `npx jest` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
```bash
git add src/components/ExtraMealSheet.tsx __tests__/ExtraMealSheet.test.tsx
git commit -m "feat: add ExtraMealSheet (description + calorie estimate)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: ExtraMealDetail (day's extras list)

**Files:** Create `src/components/ExtraMealDetail.tsx`, `__tests__/ExtraMealDetail.test.tsx`.

Mirrors `MealPrepDetail` styling. Lists a date's extras with a remove control; shows an empty state when none.

- [ ] **Step 1: Write failing test** `__tests__/ExtraMealDetail.test.tsx`:
```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ExtraMealDetail from '../src/components/ExtraMealDetail'
import { ExtraMeal } from '../src/types'

const extras: ExtraMeal[] = [
  { id: 'a', date: '2026-06-02', name: 'Protein Bar', kcal: 220 },
  { id: 'b', date: '2026-06-02', name: 'Sushi with friends', kcal: 850 },
]

describe('ExtraMealDetail', () => {
  it('lists the day\'s extras with calories', () => {
    const { getAllByTestId, getByText } = render(
      <ExtraMealDetail date="2026-06-02" extras={extras} onRemoveExtra={() => {}} />
    )
    expect(getAllByTestId('extra-item')).toHaveLength(2)
    getByText('Protein Bar')
    getByText(/850 kcal/)
  })

  it('fires onRemoveExtra with the id of the tapped row', () => {
    const onRemoveExtra = jest.fn()
    const { getAllByTestId } = render(
      <ExtraMealDetail date="2026-06-02" extras={extras} onRemoveExtra={onRemoveExtra} />
    )
    fireEvent.press(getAllByTestId('remove-extra')[1])
    expect(onRemoveExtra).toHaveBeenCalledWith('b')
  })

  it('shows an empty state when there are no extras', () => {
    const { getByText, queryAllByTestId } = render(
      <ExtraMealDetail date="2026-06-02" extras={[]} onRemoveExtra={() => {}} />
    )
    expect(queryAllByTestId('extra-item')).toHaveLength(0)
    getByText(/No extra meals yet/)
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/ExtraMealDetail.test.tsx`

- [ ] **Step 3: Implement** `src/components/ExtraMealDetail.tsx`:
```tsx
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  date: string
  extras: ExtraMeal[]
  onRemoveExtra: (id: string) => void
}

export default function ExtraMealDetail({ date, extras, onRemoveExtra }: Props) {
  const { day, month } = formatDay(date)

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{`Extra meals · ${day} ${month}`}</Text>
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals yet — tap ＋ to add one.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {extras.map((e) => (
            <View key={e.id} testID="extra-item" style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.name}>{e.name}</Text>
                <Text style={styles.meta}>{e.kcal} kcal</Text>
              </View>
              <TouchableOpacity
                testID="remove-extra"
                accessibilityLabel={`Remove ${e.name}`}
                style={styles.remove}
                onPress={() => onRemoveExtra(e.id)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.detailBackground,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, flex: 1,
  },
  header: { fontSize: 15, fontWeight: '700', color: colors.kcalText, marginBottom: 12 },
  empty: { fontSize: 14, color: colors.monthText, marginTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.itemCard, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginBottom: 2 },
  meta: { fontSize: 13, color: colors.monthText },
  remove: { paddingHorizontal: 8, paddingVertical: 4 },
  removeText: { fontSize: 18, color: colors.monthText },
})
```

- [ ] **Step 4: Verify.** `npx jest __tests__/ExtraMealDetail.test.tsx` passes; full `npx jest` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
```bash
git add src/components/ExtraMealDetail.tsx __tests__/ExtraMealDetail.test.tsx
git commit -m "feat: add ExtraMealDetail list with tap-to-remove

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: AddFab manual-only mode

**Files:** Modify `src/components/AddFab.tsx`; Test `__tests__/AddFab.test.tsx`.

In extra mode the FAB has no scan menu — pressing it goes straight to manual add.

- [ ] **Step 1: Write failing test** — append to `__tests__/AddFab.test.tsx`:
```tsx
it('in manualOnly mode, pressing the fab calls onAddManual directly with no menu', () => {
  const onAddManual = jest.fn()
  const { getByTestId, queryByTestId } = render(
    <AddFab manualOnly onAddManual={onAddManual} />
  )
  fireEvent.press(getByTestId('add-fab'))
  expect(onAddManual).toHaveBeenCalled()
  expect(queryByTestId('fab-barcode')).toBeNull()
  expect(queryByTestId('fab-receipt')).toBeNull()
  expect(queryByTestId('fab-manual')).toBeNull()
})
```

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/AddFab.test.tsx`

- [ ] **Step 3: Implement** in `src/components/AddFab.tsx`:
  - Change `Props` so scan handlers are optional and add `manualOnly`:
```tsx
type Props = {
  onScanBarcode?: () => void
  onScanReceipt?: () => void
  onAddManual: () => void
  manualOnly?: boolean
}
```
  - In the component, when `manualOnly` is true, the FAB press calls `onAddManual` directly and the expanding menu never renders. Simplest: at the top of the `onPress` for the main FAB:
```tsx
      <TouchableOpacity
        testID="add-fab"
        style={styles.fab}
        onPress={() => (manualOnly ? onAddManual() : toggle(!open))}
        activeOpacity={0.85}
      >
```
  and guard the menu so it never shows in manualOnly mode:
```tsx
      {open && !manualOnly && (
        <View style={styles.menu}>
          ...existing three options...
        </View>
      )}
```
  (The existing `choose`/`toggle`/rotation logic stays for the normal mode. `onScanBarcode?.()` / `onScanReceipt?.()` calls — since those props are now optional, call them via the existing `choose(onScanBarcode)` only in the non-manualOnly menu which is unchanged; TypeScript: because they're optional, wrap the menu options' handlers as `choose(() => onScanBarcode?.())` if tsc complains about `undefined` not being callable.)

- [ ] **Step 4: Verify.** `npx jest __tests__/AddFab.test.tsx` passes; full `npx jest` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
```bash
git add src/components/AddFab.tsx __tests__/AddFab.test.tsx
git commit -m "feat: add manualOnly mode to AddFab

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Wire extra meals into App

**Files:** Modify `App.tsx`; Test `__tests__/App.extras.test.tsx`.

Read the full `App.tsx` first. This wires state, persistence, selection, the extra-mode render, and the real BudgetBar numbers.

- [ ] **Step 1: Write failing integration test** `__tests__/App.extras.test.tsx`:
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

describe('extra meals', () => {
  it('adds an extra via a faint pill, shows it, and surfaces a solid pill', async () => {
    const { getAllByTestId, getByTestId, queryByTestId, findByTestId } = render(<App />)
    // wait for hydration to settle (seed cycle renders)
    await findByTestId('add-fab')

    // 2026-06-09 is outside any seeded cycle and has no extra -> faint add pill exists.
    // Tap the first faint add-extra pill to enter extra mode.
    const adds = getAllByTestId('add-extra')
    fireEvent.press(adds[0])

    // extra-mode FAB (manual only) -> opens the sheet directly
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '850')
    fireEvent.press(getByTestId('save-extra-button'))

    await waitFor(() => expect(getAllByTestId('extra-item').length).toBeGreaterThan(0))
    expect(within(getAllByTestId('extra-item')[0]).getByText('Sushi with friends')).toBeTruthy()
  })

  it('removes an extra after confirming the dialog', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, btns) => btns?.[1]?.onPress?.())
    const { getAllByTestId, getByTestId, findByTestId } = render(<App />)
    await findByTestId('add-fab')
    fireEvent.press(getAllByTestId('add-extra')[0])
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Cake')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '400')
    fireEvent.press(getByTestId('save-extra-button'))
    await waitFor(() => expect(getAllByTestId('extra-item').length).toBe(1))
    fireEvent.press(getAllByTestId('remove-extra')[0])
    await waitFor(() => expect(getAllByTestId('extra-item').length).toBe(0))
  })
})
```
> Note: the seed `extraMeals` (6/02, 6/03) are inside cycle-1's range (5/31–6/04). Pick a faint `add-extra` pill — there are many days without extras in the 45-day window, so `getAllByTestId('add-extra')[0]` is the earliest empty day (2026-05-24). That day is outside any cycle, which exercises the daily-goal branch of the budget bar. The test only asserts extra add/remove, not the exact date.

- [ ] **Step 2: Run, verify fail.** `npx jest __tests__/App.extras.test.tsx`

- [ ] **Step 3: Implement** in `App.tsx`:

  1. **Imports:** add `Alert` to `react-native`; import the new pieces and helpers:
```tsx
import ExtraMealDetail from './src/components/ExtraMealDetail'
import ExtraMealSheet from './src/components/ExtraMealSheet'
import { cycles as initialCycles, extraMeals as initialExtraMeals, DAILY_KCAL_GOAL } from './src/data'
import { totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate } from './src/utils/nutrition'
import { loadCycles, saveCycles, loadExtras, saveExtras } from './src/services/storage'
import { ExtraMeal } from './src/types'
```
  (Remove the old `extraMeals` static import usage — it's now state. Keep `ReceiptLine`, `FoodItem`, `Product` imports.)

  2. **State:**
```tsx
  const [extraMeals, setExtraMeals] = useState<ExtraMeal[]>(initialExtraMeals)
  const [activeExtraDate, setActiveExtraDate] = useState<string | null>(null)
  const [extraSheetVisible, setExtraSheetVisible] = useState(false)
```

  3. **Hydration:** in the existing mount `useEffect` that calls `loadCycles().then(...)`, after setting cycles also load extras:
```tsx
    loadExtras().then((stored) => {
      if (!cancelled && stored) setExtraMeals(stored)
    })
```
  (Place it inside the same effect, alongside the existing `loadCycles` call; it can be a separate `.then` chain. Keep the `cancelled` guard.)

  4. **Persist:**
```tsx
  useEffect(() => {
    if (hydrated) saveExtras(extraMeals)
  }, [extraMeals, hydrated])
```

  5. **Selection handlers:**
```tsx
  function handleExtraPress(date: string) {
    setActiveCycleId(null)
    setActiveExtraDate((prev) => (prev === date ? null : date))
  }

  function handleAddExtra() {
    setExtraSheetVisible(true)
  }

  function handleSaveExtra(draft: { name: string; kcal: number }) {
    if (!activeExtraDate) return
    setExtraMeals((prev) => [
      ...prev,
      { id: `extra-${Date.now()}`, date: activeExtraDate, name: draft.name, kcal: draft.kcal },
    ])
    setExtraSheetVisible(false)
  }

  function handleRemoveExtra(id: string) {
    Alert.alert('Remove extra meal', 'Remove this extra meal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setExtraMeals((prev) => prev.filter((e) => e.id !== id)) },
    ])
  }
```
  Also update `handleCyclePress` to leave extra mode: add `setActiveExtraDate(null)` at its start.

  6. **Derived values** (replace the existing `extraDates`/budget computations near the bottom):
```tsx
  const extraDates = extraMeals.map((e) => e.date)
  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null

  // Budget-bar numbers, shared by both modes.
  let barMealPrep = 0
  let barExtra = 0
  let barBudget = DAILY_KCAL_GOAL
  if (activeExtraDate) {
    const containing = cycles.find(
      (c) => activeExtraDate >= c.startDate && activeExtraDate <= c.endDate
    )
    if (containing) {
      const days = daysBetween(containing.startDate, containing.endDate) + 1
      barMealPrep = totalKcal(containing.items)
      barExtra = extrasKcalInRange(extraMeals, containing.startDate, containing.endDate)
      barBudget = cycleBudget(days, DAILY_KCAL_GOAL)
    } else {
      barMealPrep = 0
      barExtra = extrasKcalOnDate(extraMeals, activeExtraDate)
      barBudget = DAILY_KCAL_GOAL
    }
  } else if (activeCycle) {
    const days = daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    barMealPrep = totalKcal(activeCycle.items)
    barExtra = extrasKcalInRange(extraMeals, activeCycle.startDate, activeCycle.endDate)
    barBudget = cycleBudget(days, DAILY_KCAL_GOAL)
  }
  const extrasForActiveDate = activeExtraDate
    ? extraMeals.filter((e) => e.date === activeExtraDate)
    : []
```
  (Keep `activeDayCount` for `NewPeriodPanel`. The old `stockedKcal`/`budgetKcal` consts can be removed in favor of the `bar*` values, or left if still referenced — ensure no duplicate/unused vars trip tsc.)

  7. **CalendarStrip call:** pass the real handler + active date:
```tsx
            <CalendarStrip
              windowStart={windowStart}
              totalDays={TOTAL_DAYS}
              today={today}
              extraDates={extraDates}
              onExtraPress={handleExtraPress}
              activeExtraDate={activeExtraDate}
              dayWidth={DAY_WIDTH}
            />
```

  8. **Bottom panel render:** extra mode takes priority. Replace the `activeCycle && ...` panel block so it reads:
```tsx
        {activeExtraDate ? (
          <View style={styles.detailArea}>
            <BudgetBar mealPrepKcal={barMealPrep} extraKcal={barExtra} budgetKcal={barBudget} />
            <ExtraMealDetail
              date={activeExtraDate}
              extras={extrasForActiveDate}
              onRemoveExtra={handleRemoveExtra}
            />
            <AddFab manualOnly onAddManual={handleAddExtra} />
          </View>
        ) : (
          <>
            {activeCycle && activeCycle.items.length === 0 && (
              <NewPeriodPanel
                dayCount={activeDayCount}
                onDaysChange={handleChangeDays}
                onScanBarcode={handleScanBarcode}
                onScanReceipt={handleScanReceipt}
                onAddManual={handleAddManual}
              />
            )}
            {activeCycle && activeCycle.items.length > 0 && (
              <View style={styles.detailArea}>
                <BudgetBar mealPrepKcal={barMealPrep} extraKcal={barExtra} budgetKcal={barBudget} />
                <MealPrepDetail activeCycle={activeCycle} onRemoveItem={handleRemoveItem} />
                <AddFab
                  onScanBarcode={handleScanBarcode}
                  onScanReceipt={handleScanReceipt}
                  onAddManual={handleAddManual}
                />
              </View>
            )}
          </>
        )}
```
  (This replaces the Task 3/4 stub props on `BudgetBar`/`CalendarStrip`. Match the existing JSX names — `MealPrepDetail` already takes `onRemoveItem`; `AddFab` already takes the three handlers.)

  9. **Render the ExtraMealSheet** alongside the other modals (near `<AddItemSheet />`):
```tsx
        <ExtraMealSheet
          visible={extraSheetVisible}
          onSave={handleSaveExtra}
          onClose={() => setExtraSheetVisible(false)}
        />
```

- [ ] **Step 4: Verify.** `npx jest __tests__/App.extras.test.tsx __tests__/App.addToCycle.test.tsx __tests__/App.manualAndDelete.test.tsx` all pass; full `npx jest` green; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
```bash
git add App.tsx __tests__/App.extras.test.tsx
git commit -m "feat: wire interactive extra meals into App (mode, persistence, budget)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (executor self-review)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx jest` — full suite green (prior 91 + new: nutrition extras, storage extras, BudgetBar, CalendarStrip, ExtraMealSheet, ExtraMealDetail, AddFab manualOnly, App.extras)
- [ ] `npx expo export --platform ios --output-dir /tmp/extras-ios && npx expo export --platform web --output-dir /tmp/extras-web` both succeed; then `rm -rf /tmp/extras-ios /tmp/extras-web`
- [ ] **No `expo start`** run; no test imports the camera / `scan.ts` (App tests mock `../src/services/scan`)
- [ ] Cycle mode unchanged except BudgetBar now shows pink extras within the cycle range; receipt/barcode/manual flows untouched
- [ ] Device note (human): faint pills, extra-mode panel, the description sheet, and the two-color bar are best confirmed on a physical phone via Expo Go.
```
