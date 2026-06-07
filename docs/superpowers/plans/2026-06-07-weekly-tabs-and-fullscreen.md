# Weekly View Tabs & Full-Screen Profile/Pantry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a segmented Basket/Extras/Pantry nav that toggles the lower detail box of a selected meal-prep period, split pantry calories into a third budget-bar segment, and convert the Profile and global Pantry editors to full-screen.

**Architecture:** A new `weeklyTab` state in `App.tsx` selects which of three components renders in the period detail area (`MealPrepDetail` / `ExtrasPeriodList` / `PantryPeriodView`). A new `SegmentedNav` sits beside the existing `AddFab`. The pantry section moves out of `MealPrepDetail` into its own tab view. `BudgetBar` gains a `pantryKcal` prop and renders three stacked segments. `ProfileScreen` and `PantryScreen` switch from bottom-sheet modals to full-screen layouts.

**Tech Stack:** React Native + Expo, TypeScript, Jest + @testing-library/react-native.

---

## File Structure

- `src/styles/colors.ts` — add `pantry`, `navTrack`, `navSegmentActive` colors.
- `src/components/BudgetBar.tsx` — add third (pantry) segment.
- `src/types.ts` — add `WeeklyTab` union type.
- `src/components/SegmentedNav.tsx` — **new**, the pill toggle.
- `src/components/ExtrasPeriodList.tsx` — **new**, period-scoped extras list.
- `src/components/PantryPeriodView.tsx` — **new**, period-scoped pantry view (the section moved out of `MealPrepDetail`).
- `src/components/MealPrepDetail.tsx` — remove embedded pantry section.
- `App.tsx` — tab state, selection reset, budget math split, render branching, bottom bar, extra default date.
- `src/components/ProfileScreen.tsx` — full-screen.
- `src/components/PantryScreen.tsx` — full-screen.

Run the whole suite at any time with: `npm test`. Run one file with: `npm test -- BudgetBar`.

---

### Task 1: 3-color budget bar

**Files:**
- Modify: `src/styles/colors.ts`
- Modify: `src/components/BudgetBar.tsx`
- Test: `__tests__/BudgetBar.test.tsx`

- [ ] **Step 1: Add the pantry color**

In `src/styles/colors.ts`, add three keys to the `colors` object (before the closing brace):

```ts
  pantry: '#E8B04B',
  navTrack: '#8A8A8A',
  navSegmentActive: '#3A3A3A',
```

- [ ] **Step 2: Write the failing tests**

Replace the body of `__tests__/BudgetBar.test.tsx` with:

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
  it('shows the combined total (meal prep + pantry + extra) over budget', () => {
    const { getByText } = render(
      <BudgetBar mealPrepKcal={1000} pantryKcal={500} extraKcal={500} budgetKcal={8000} />
    )
    expect(getByText('2000 / 8000 kcal')).toBeTruthy()
  })

  it('renders green meal-prep, pantry, and pink extra segments at the right widths', () => {
    const { getByTestId } = render(
      <BudgetBar mealPrepKcal={2000} pantryKcal={2000} extraKcal={2000} budgetKcal={8000} />
    )
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-pantry-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('25%')
  })

  it('never lets the three segments exceed 100% combined', () => {
    const { getByTestId } = render(
      <BudgetBar mealPrepKcal={6000} pantryKcal={4000} extraKcal={2000} budgetKcal={8000} />
    )
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('75%')
    expect(widthOf(getByTestId('budget-bar-pantry-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('0%')
  })

  it('renders a legend for all three components', () => {
    const { getByText } = render(
      <BudgetBar mealPrepKcal={0} pantryKcal={0} extraKcal={0} budgetKcal={2000} />
    )
    expect(getByText('Meal prep')).toBeTruthy()
    expect(getByText('Pantry')).toBeTruthy()
    expect(getByText('Extra')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- BudgetBar`
Expected: FAIL (`pantryKcal` not used yet; `budget-bar-pantry-fill` not found).

- [ ] **Step 4: Implement the third segment**

Replace `src/components/BudgetBar.tsx` with:

```tsx
import React from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  mealPrepKcal: number
  pantryKcal: number
  extraKcal: number
  budgetKcal: number
}

export default function BudgetBar({ mealPrepKcal, pantryKcal, extraKcal, budgetKcal }: Props) {
  const budget = budgetKcal > 0 ? budgetKcal : 1
  const greenRatio = Math.min(mealPrepKcal, budget) / budget
  const afterGreen = Math.max(0, budget - mealPrepKcal)
  const pantryRatio = Math.min(pantryKcal, afterGreen) / budget
  const afterPantry = Math.max(0, budget - mealPrepKcal - pantryKcal)
  const pinkRatio = Math.min(extraKcal, afterPantry) / budget
  const greenPct: DimensionValue = `${Math.round(greenRatio * 100)}%`
  const pantryPct: DimensionValue = `${Math.round(pantryRatio * 100)}%`
  const pinkPct: DimensionValue = `${Math.round(pinkRatio * 100)}%`

  return (
    <View style={styles.container} testID="budget-bar">
      <Text style={styles.label}>
        {mealPrepKcal + pantryKcal + extraKcal} / {budgetKcal} kcal
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, styles.green, { width: greenPct }]} testID="budget-bar-fill" />
        <View style={[styles.fill, styles.amber, { width: pantryPct }]} testID="budget-bar-pantry-fill" />
        <View style={[styles.fill, styles.pink, { width: pinkPct }]} testID="budget-bar-extra-fill" />
      </View>
      <View style={styles.legend}>
        <View style={[styles.dot, styles.green]} />
        <Text style={styles.legendText}>Meal prep</Text>
        <View style={[styles.dot, styles.amber]} />
        <Text style={styles.legendText}>Pantry</Text>
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
  amber: { backgroundColor: colors.pantry },
  pink: { backgroundColor: colors.extraPill },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 11, color: colors.monthText, marginRight: 12 },
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- BudgetBar`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/styles/colors.ts src/components/BudgetBar.tsx __tests__/BudgetBar.test.tsx
git commit -m "feat: add pantry segment to budget bar"
```

---

### Task 2: WeeklyTab type + SegmentedNav

**Files:**
- Modify: `src/types.ts`
- Create: `src/components/SegmentedNav.tsx`
- Test: `__tests__/SegmentedNav.test.tsx`

- [ ] **Step 1: Add the WeeklyTab type**

Append to `src/types.ts`:

```ts
export type WeeklyTab = 'basket' | 'extras' | 'pantry'
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/SegmentedNav.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import SegmentedNav from '../src/components/SegmentedNav'

describe('SegmentedNav', () => {
  it('renders the three tabs', () => {
    const { getByTestId } = render(<SegmentedNav active="basket" onChange={() => {}} />)
    expect(getByTestId('tab-basket')).toBeTruthy()
    expect(getByTestId('tab-extras')).toBeTruthy()
    expect(getByTestId('tab-pantry')).toBeTruthy()
  })

  it('marks the active tab as selected', () => {
    const { getByTestId } = render(<SegmentedNav active="extras" onChange={() => {}} />)
    expect(getByTestId('tab-extras').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('tab-basket').props.accessibilityState.selected).toBe(false)
  })

  it('calls onChange with the tab key when a segment is pressed', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(<SegmentedNav active="basket" onChange={onChange} />)
    fireEvent.press(getByTestId('tab-pantry'))
    expect(onChange).toHaveBeenCalledWith('pantry')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- SegmentedNav`
Expected: FAIL (cannot find module `SegmentedNav`).

- [ ] **Step 4: Implement SegmentedNav**

Create `src/components/SegmentedNav.tsx`:

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { WeeklyTab } from '../types'
import { colors } from '../styles/colors'

type Props = {
  active: WeeklyTab
  onChange: (tab: WeeklyTab) => void
}

const TABS: { key: WeeklyTab; label: string }[] = [
  { key: 'basket', label: 'Basket' },
  { key: 'extras', label: 'Extras' },
  { key: 'pantry', label: 'Pantry' },
]

export default function SegmentedNav({ active, onChange }: Props) {
  return (
    <View style={styles.pill} testID="segmented-nav">
      {TABS.map((t) => {
        const isActive = t.key === active
        return (
          <TouchableOpacity
            key={t.key}
            testID={`tab-${t.key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    backgroundColor: colors.navTrack,
    borderRadius: 26,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.navSegmentActive },
  label: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', opacity: 0.75 },
  labelActive: { opacity: 1 },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- SegmentedNav`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/components/SegmentedNav.tsx __tests__/SegmentedNav.test.tsx
git commit -m "feat: add SegmentedNav and WeeklyTab type"
```

---

### Task 3: ExtrasPeriodList

**Files:**
- Create: `src/components/ExtrasPeriodList.tsx`
- Test: `__tests__/ExtrasPeriodList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/ExtrasPeriodList.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent, within } from '@testing-library/react-native'
import ExtrasPeriodList from '../src/components/ExtrasPeriodList'
import { ExtraMeal } from '../src/types'

const extras: ExtraMeal[] = [
  { id: 'e1', date: '2026-06-02', name: 'Protein Bar', kcal: 220 },
  { id: 'e2', date: '2026-06-03', name: 'Latte', kcal: 90 },
]

describe('ExtrasPeriodList', () => {
  it('shows an empty hint when there are no extras', () => {
    const { getByText } = render(<ExtrasPeriodList extras={[]} onRemoveExtra={() => {}} />)
    expect(getByText(/No extra meals/)).toBeTruthy()
  })

  it('renders a row per extra with its name and kcal', () => {
    const { getAllByTestId } = render(<ExtrasPeriodList extras={extras} onRemoveExtra={() => {}} />)
    const rows = getAllByTestId('extra-item')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Protein Bar')).toBeTruthy()
    expect(within(rows[0]).getByText(/220 kcal/)).toBeTruthy()
  })

  it('calls onRemoveExtra with the extra id', () => {
    const onRemoveExtra = jest.fn()
    const { getAllByTestId } = render(<ExtrasPeriodList extras={extras} onRemoveExtra={onRemoveExtra} />)
    fireEvent.press(getAllByTestId('remove-extra')[1])
    expect(onRemoveExtra).toHaveBeenCalledWith('e2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ExtrasPeriodList`
Expected: FAIL (cannot find module `ExtrasPeriodList`).

- [ ] **Step 3: Implement ExtrasPeriodList**

Create `src/components/ExtrasPeriodList.tsx`:

```tsx
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  extras: ExtraMeal[]
  onRemoveExtra: (id: string) => void
}

export default function ExtrasPeriodList({ extras, onRemoveExtra }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Extra meals</Text>
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals in this period — tap ＋ to add one.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {extras.map((e) => {
            const { day, month } = formatDay(e.date)
            return (
              <View key={e.id} testID="extra-item" style={styles.card}>
                <View style={styles.info}>
                  <Text style={styles.name}>{e.name}</Text>
                  <Text style={styles.meta}>{day} {month} · {e.kcal} kcal</Text>
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
            )
          })}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ExtrasPeriodList`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ExtrasPeriodList.tsx __tests__/ExtrasPeriodList.test.tsx
git commit -m "feat: add ExtrasPeriodList component"
```

---

### Task 4: PantryPeriodView

**Files:**
- Create: `src/components/PantryPeriodView.tsx`
- Test: `__tests__/PantryPeriodView.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/PantryPeriodView.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import PantryPeriodView from '../src/components/PantryPeriodView'
import { PantryItem, MealPrepCycle } from '../src/types'

const oats: PantryItem = { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 }
const cycle: MealPrepCycle = { id: 'c', startDate: '2026-06-01', endDate: '2026-06-05', items: [] }

describe('PantryPeriodView', () => {
  it('shows an empty hint when there are no staples', () => {
    const { getByText } = render(
      <PantryPeriodView cycle={cycle} pantry={[]} cycleDays={5} />
    )
    expect(getByText(/No pantry staples/)).toBeTruthy()
  })

  it('renders grams (40×5=200) and kcal (758) for a staple with no override', () => {
    const { getAllByTestId, getByTestId, getByText } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} />
    )
    expect(getAllByTestId('pantry-detail-row')).toHaveLength(1)
    expect(getByTestId('pantry-grams').props.value).toBe('200')
    expect(getByText('758 kcal')).toBeTruthy()
  })

  it('uses an override value from pantryOverrides', () => {
    const overridden: MealPrepCycle = { ...cycle, pantryOverrides: { 'pantry-oats': 120 } }
    const { getByTestId } = render(
      <PantryPeriodView cycle={overridden} pantry={[oats]} cycleDays={5} />
    )
    expect(getByTestId('pantry-grams').props.value).toBe('120')
  })

  it('fires onSetPantryGrams with the id and parsed grams on change', () => {
    const onSetPantryGrams = jest.fn()
    const { getByTestId } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} onSetPantryGrams={onSetPantryGrams} />
    )
    fireEvent.changeText(getByTestId('pantry-grams'), '150')
    expect(onSetPantryGrams).toHaveBeenCalledWith('pantry-oats', 150)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PantryPeriodView`
Expected: FAIL (cannot find module `PantryPeriodView`).

- [ ] **Step 3: Implement PantryPeriodView**

Create `src/components/PantryPeriodView.tsx`:

```tsx
import React from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native'
import { MealPrepCycle, PantryItem } from '../types'
import { pantryGramsForCycle, kcalForWeight } from '../utils/nutrition'
import { colors } from '../styles/colors'

type Props = {
  cycle: MealPrepCycle
  pantry: PantryItem[]
  cycleDays: number
  onSetPantryGrams?: (id: string, grams: number) => void
}

export default function PantryPeriodView({ cycle, pantry, cycleDays, onSetPantryGrams }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry · {cycleDays} days</Text>
      {pantry.length === 0 ? (
        <Text style={styles.empty}>No pantry staples yet — add them from the Pantry settings.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {pantry.map((item) => {
            const grams = pantryGramsForCycle(item, cycle, cycleDays)
            const kcal = kcalForWeight(item.kcalPer100g, grams)
            return (
              <View key={item.id} testID="pantry-detail-row" style={styles.card}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={[styles.name, styles.info]}>{item.name}</Text>
                <TextInput
                  testID="pantry-grams"
                  style={styles.gramsInput}
                  value={String(grams)}
                  keyboardType="numeric"
                  onChangeText={(t) => onSetPantryGrams?.(item.id, parseInt(t, 10) || 0)}
                />
                <Text style={styles.meta}>{kcal} kcal</Text>
              </View>
            )
          })}
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
  emoji: { fontSize: 32, marginRight: 14 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginBottom: 2 },
  meta: { fontSize: 13, color: colors.monthText },
  gramsInput: {
    width: 56, fontSize: 13, color: colors.kcalText,
    borderBottomWidth: 1, borderBottomColor: colors.monthText,
    marginRight: 6, textAlign: 'center',
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PantryPeriodView`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/PantryPeriodView.tsx __tests__/PantryPeriodView.test.tsx
git commit -m "feat: add PantryPeriodView component"
```

---

### Task 5: Remove the pantry section from MealPrepDetail

**Files:**
- Modify: `src/components/MealPrepDetail.tsx`
- Test: `__tests__/MealPrepDetail.test.tsx`

- [ ] **Step 1: Delete the pantry-section tests**

In `__tests__/MealPrepDetail.test.tsx`, delete the entire `describe('pantry section', () => { ... })` block (it now lives in `PantryPeriodView.test.tsx`). Also delete the now-unused `oats` constant and the `cycleNoPantryOverrides` constant at the top, and remove `PantryItem` from the `import { ... } from '../src/types'` line, leaving `import { MealPrepCycle } from '../src/types'` — but note `cycleNoPantryOverrides` and `MealPrepCycle` are only used by the deleted block, so if no other test uses them, delete the type import line entirely. After editing, the file imports only what the remaining item-card tests use:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import MealPrepDetail from '../src/components/MealPrepDetail'
import { cycles } from '../src/data'
```

(Keep all the item-card `it(...)` tests that use `cycles[0]` and the inline `cycle` object in the `×N` test.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- MealPrepDetail`
Expected: FAIL — the component still references `pantry`/`pantryGramsForCycle`, but more importantly we now drive removal of that code in Step 3. (If the suite passes here because the component is unchanged, that's fine; Step 3 is a safe refactor verified by Step 4.)

- [ ] **Step 3: Strip the pantry section from the component**

Replace `src/components/MealPrepDetail.tsx` with:

```tsx
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { colors } from '../styles/colors'

type Props = {
  activeCycle: MealPrepCycle | null
  onRemoveItem?: (index: number) => void
  onEditItem?: (index: number) => void
}

export default function MealPrepDetail({ activeCycle, onRemoveItem, onEditItem }: Props) {
  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeCycle.items.map((item, idx) => (
          <View key={idx} testID="food-item" style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <TouchableOpacity
              testID="edit-item"
              style={styles.info}
              onPress={() => onEditItem?.(idx)}
            >
              <Text style={styles.name}>
                {item.name}
                {(item.quantity ?? 1) > 1 ? `  ×${item.quantity}` : ''}
              </Text>
              <Text style={styles.meta}>
                {item.weightG}g  {item.kcal * (item.quantity ?? 1)}kcal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="remove-item"
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
              style={styles.remove}
              onPress={() => onRemoveItem?.(idx)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.detailBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.itemCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  emoji: { fontSize: 32, marginRight: 14 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginBottom: 2 },
  meta: { fontSize: 13, color: colors.monthText },
  remove: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  removeText: { fontSize: 16, color: colors.monthText },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- MealPrepDetail`
Expected: PASS (the item-card tests only).

- [ ] **Step 5: Commit**

```bash
git add src/components/MealPrepDetail.tsx __tests__/MealPrepDetail.test.tsx
git commit -m "refactor: move pantry section out of MealPrepDetail"
```

---

### Task 6: Wire the weekly tabs into App

**Files:**
- Modify: `App.tsx`
- Test: `__tests__/App.weeklyTabs.test.tsx`

- [ ] **Step 1: Write the failing integration test**

Create `__tests__/App.weeklyTabs.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  simulateReceiptScan: jest.fn(),
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

// On 2026-06-07 the active cycle is cycle-2 (2026-06-05..2026-06-09), which has items,
// so the period detail view with the segmented nav renders on load.
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-07'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

describe('weekly tabs', () => {
  it('defaults to the Basket tab showing food items with the FAB visible', async () => {
    const { findByTestId, getAllByTestId, getByTestId } = render(<App />)
    await findByTestId('segmented-nav')
    expect(getAllByTestId('food-item').length).toBeGreaterThan(0)
    expect(getByTestId('add-fab')).toBeTruthy()
  })

  it('switches to the Pantry tab, hides the FAB, and shows pantry rows', async () => {
    const { findByTestId, getByTestId, queryByTestId, getAllByTestId } = render(<App />)
    await findByTestId('segmented-nav')
    fireEvent.press(getByTestId('tab-pantry'))
    await waitFor(() => expect(getAllByTestId('pantry-detail-row').length).toBeGreaterThan(0))
    expect(queryByTestId('add-fab')).toBeNull()
    expect(queryByTestId('food-item')).toBeNull()
  })

  it('switches to the Extras tab and keeps the FAB visible', async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(<App />)
    await findByTestId('segmented-nav')
    fireEvent.press(getByTestId('tab-extras'))
    await waitFor(() => expect(getByTestId('add-fab')).toBeTruthy())
    expect(queryByTestId('food-item')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App.weeklyTabs`
Expected: FAIL (`segmented-nav` not found — App doesn't render it yet).

- [ ] **Step 3: Add tab state + extra-date state and the selection reset**

In `App.tsx`, add to the imports near the other component imports:

```tsx
import SegmentedNav from './src/components/SegmentedNav'
import ExtrasPeriodList from './src/components/ExtrasPeriodList'
import PantryPeriodView from './src/components/PantryPeriodView'
```

Add `WeeklyTab` to the types import:

```tsx
import { FoodItem, ExtraMeal, ReceiptLine, PantryItem, WeeklyTab } from './src/types'
```

Add two new state hooks next to the other `useState` calls (e.g. after the `pantryVisible` line):

```tsx
  const [weeklyTab, setWeeklyTab] = useState<WeeklyTab>('basket')
  const [pendingExtraDate, setPendingExtraDate] = useState<string | null>(null)
```

In `changeSelection`, reset the tab whenever the selection changes — add this line at the end of the function body:

```tsx
    setWeeklyTab('basket')
```

- [ ] **Step 4: Rework the extra-add handlers**

Replace the existing `handleAddExtra` and `handleSaveExtra` functions with:

```tsx
  function openExtraSheet(date: string) {
    setPendingExtraDate(date)
    setExtraSheetVisible(true)
  }

  function handleAddExtra() {
    if (activeExtraDate) openExtraSheet(activeExtraDate)
  }

  function handleAddExtraForPeriod() {
    if (!activeCycle) return
    const inRange = today >= activeCycle.startDate && today <= activeCycle.endDate
    openExtraSheet(inRange ? today : activeCycle.startDate)
  }

  function handleSaveExtra(draft: { name: string; kcal: number }) {
    if (!pendingExtraDate) return
    setExtraMeals((prev) => [
      ...prev,
      { id: `extra-${Date.now()}`, date: pendingExtraDate, name: draft.name, kcal: draft.kcal },
    ])
    setExtraSheetVisible(false)
    setPendingExtraDate(null)
  }
```

Note: `activeCycle` is declared lower in the component with `const activeCycle = ...`. Since these are function declarations (hoisted) they may reference `activeCycle` fine at call time, but to be safe move the `const activeCycle = cycles.find(...)` and `const activeDayCount = ...` lines (currently just below `handleConfirmReceipt`/`handleAddManual`) to ABOVE these handlers if your linter complains about use-before-declaration. They are only read inside callbacks, so no runtime issue, but keep the code tidy.

- [ ] **Step 5: Split the budget math to break out pantry**

Find the budget block (the `let barMealPrep = 0` … big `if/else` around the middle of the component). Replace it with:

```tsx
  let barMealPrep = 0
  let barPantry = 0
  let barExtra = 0
  let barBudget = dailyGoal
  if (activeExtraDate) {
    const containing = cycles.find(
      (c) => activeExtraDate >= c.startDate && activeExtraDate <= c.endDate
    )
    if (containing) {
      const days = daysBetween(containing.startDate, containing.endDate) + 1
      barMealPrep = totalKcal(containing.items)
      barPantry = pantryKcalForCycle(pantry, containing, days)
      barExtra = extrasKcalInRange(extraMeals, containing.startDate, containing.endDate)
      barBudget = cycleBudget(days, dailyGoal)
    } else {
      barExtra = extrasKcalOnDate(extraMeals, activeExtraDate)
      barBudget = dailyGoal
    }
  } else if (activeCycle) {
    const days = daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    barMealPrep = totalKcal(activeCycle.items)
    barPantry = pantryKcalForCycle(pantry, activeCycle, days)
    barExtra = extrasKcalInRange(extraMeals, activeCycle.startDate, activeCycle.endDate)
    barBudget = cycleBudget(days, dailyGoal)
  }
```

Add a period-scoped extras list near `extrasForActiveDate`:

```tsx
  const extrasForPeriod = activeCycle
    ? extraMeals.filter((e) => e.date >= activeCycle.startDate && e.date <= activeCycle.endDate)
    : []
```

- [ ] **Step 6: Update the render — extra-date branch budget bar**

In the `activeExtraDate ?` branch, update the `BudgetBar` usage to pass pantry:

```tsx
            <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} />
```

- [ ] **Step 7: Update the render — active cycle with items branch**

Replace the `{activeCycle && activeCycle.items.length > 0 && ( ... )}` block with:

```tsx
            {activeCycle && activeCycle.items.length > 0 && (
              <View style={styles.detailArea}>
                <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} />
                {weeklyTab === 'basket' && (
                  <MealPrepDetail
                    activeCycle={activeCycle}
                    onRemoveItem={handleRemoveItem}
                    onEditItem={handleEditItem}
                  />
                )}
                {weeklyTab === 'extras' && (
                  <ExtrasPeriodList extras={extrasForPeriod} onRemoveExtra={handleRemoveExtra} />
                )}
                {weeklyTab === 'pantry' && (
                  <PantryPeriodView
                    cycle={activeCycle}
                    pantry={pantry}
                    cycleDays={activeDayCount}
                    onSetPantryGrams={handleSetPantryGrams}
                  />
                )}
                <View style={[styles.navWrap, weeklyTab === 'pantry' && styles.navWrapFull]}>
                  <SegmentedNav active={weeklyTab} onChange={setWeeklyTab} />
                </View>
                {weeklyTab !== 'pantry' && (
                  <AddFab
                    manualOnly={weeklyTab === 'extras'}
                    onScanBarcode={handleScanBarcode}
                    onScanReceipt={handleScanReceipt}
                    onAddManual={weeklyTab === 'extras' ? handleAddExtraForPeriod : handleAddManual}
                  />
                )}
              </View>
            )}
```

- [ ] **Step 8: Add the nav-bar styles**

In the `StyleSheet.create({ ... })` at the bottom of `App.tsx`, add:

```tsx
  navWrap: {
    position: 'absolute',
    left: 20,
    right: 88,
    bottom: 34,
  },
  navWrapFull: {
    right: 20,
  },
```

- [ ] **Step 9: Run the new test + full suite**

Run: `npm test -- App.weeklyTabs`
Expected: PASS (3 tests).

Run: `npm test`
Expected: PASS — all suites. If `App.extras.test.tsx` fails, confirm the standalone-extra flow still calls `handleAddExtra` (which now routes through `openExtraSheet(activeExtraDate)`); the `add-extra` pill sets `activeExtraDate`, so the flow is preserved.

- [ ] **Step 10: Commit**

```bash
git add App.tsx __tests__/App.weeklyTabs.test.tsx
git commit -m "feat: weekly Basket/Extras/Pantry tab nav in period view"
```

---

### Task 7: Full-screen Profile

**Files:**
- Modify: `src/components/ProfileScreen.tsx`
- Test: `__tests__/ProfileScreen.test.tsx`

- [ ] **Step 1: Add a full-screen assertion test**

Open `__tests__/ProfileScreen.test.tsx`. Keep all existing tests. Add this test inside the top-level `describe` block:

```tsx
  it('renders a full-screen container (not a bottom-sheet backdrop)', () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileScreen visible dailyGoal={2000} onSave={() => {}} onClose={() => {}} />
    )
    expect(getByTestId('profile-screen')).toBeTruthy()
    expect(queryByTestId('daily-goal-input')).toBeTruthy()
  })
```

If the existing test file uses a `setup()` helper or different prop names, mirror that file's existing render call; the only new assertions are the two `expect` lines above.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProfileScreen`
Expected: FAIL (`profile-screen` testID not found).

- [ ] **Step 3: Convert to full-screen**

Replace `src/components/ProfileScreen.tsx` with:

```tsx
import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  dailyGoal: number
  onSave: (goal: number) => void
  onClose: () => void
}

export default function ProfileScreen({ visible, dailyGoal, onSave, onClose }: Props) {
  const [value, setValue] = useState(String(dailyGoal))

  useEffect(() => {
    setValue(String(dailyGoal))
  }, [dailyGoal, visible])

  const parsed = parseInt(value, 10)
  const canSave = !isNaN(parsed) && parsed > 0

  function handleSave() {
    if (!canSave) return
    onSave(parsed)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} testID="profile-screen">
        <View style={styles.topBar}>
          <TouchableOpacity testID="profile-close" onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.backBtn} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Daily calorie goal (kcal)</Text>
            <TextInput
              testID="daily-goal-input"
              style={styles.input}
              keyboardType="numeric"
              value={value}
              onChangeText={setValue}
              returnKeyType="done"
            />

            <TouchableOpacity
              testID="save-profile"
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 16, color: colors.monthText },
  title: { fontSize: 18, fontWeight: '700', color: colors.kcalText },
  body: { padding: 24 },
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
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProfileScreen`
Expected: PASS. (The `profile-close` testID is preserved, so existing close tests still pass.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileScreen.tsx __tests__/ProfileScreen.test.tsx
git commit -m "feat: full-screen Profile"
```

---

### Task 8: Full-screen Pantry editor

**Files:**
- Modify: `src/components/PantryScreen.tsx`
- Test: `__tests__/PantryScreen.test.tsx`

- [ ] **Step 1: Add a full-screen assertion test**

Open `__tests__/PantryScreen.test.tsx`. Keep all existing tests. Add inside the top-level `describe`:

```tsx
  it('renders a full-screen container', () => {
    const { getByTestId } = render(
      <PantryScreen visible pantry={[]} onAdd={() => {}} onRemove={() => {}} onClose={() => {}} />
    )
    expect(getByTestId('pantry-screen')).toBeTruthy()
  })
```

If the existing tests use a `setup()` helper, render via that instead; only the `pantry-screen` assertion is new.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PantryScreen`
Expected: FAIL (`pantry-screen` testID not found).

- [ ] **Step 3: Convert to full-screen**

Replace `src/components/PantryScreen.tsx` with:

```tsx
import React, { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { colors } from '../styles/colors'
import { PantryItem } from '../types'

type Props = {
  visible: boolean
  pantry: PantryItem[]
  onAdd: (draft: { name: string; kcalPer100g: number; dailyG: number }) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export default function PantryScreen({ visible, pantry, onAdd, onRemove, onClose }: Props) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [grams, setGrams] = useState('')

  const kcalNum = parseFloat(kcal) || 0
  const gramsNum = parseFloat(grams) || 0
  const canAdd = name.trim().length > 0 && kcalNum > 0 && gramsNum > 0

  function handleAdd() {
    if (!canAdd) return
    onAdd({ name: name.trim(), kcalPer100g: kcalNum, dailyG: gramsNum })
    setName('')
    setKcal('')
    setGrams('')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} testID="pantry-screen">
        <View style={styles.topBar}>
          <TouchableOpacity testID="pantry-close" onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pantry</Text>
          <View style={styles.backBtn} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>Staples you eat regularly</Text>

            {pantry.map((item) => (
              <View key={item.id} testID="pantry-row" style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.emoji} {item.name}</Text>
                  <Text style={styles.rowMeta}>{item.dailyG} g/day · {item.kcalPer100g} kcal/100g</Text>
                </View>
                <TouchableOpacity
                  testID="pantry-remove"
                  onPress={() => onRemove(item.id)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              testID="pantry-name-input"
              style={styles.input}
              placeholder="e.g. Oats"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>kcal / 100 g</Text>
            <TextInput
              testID="pantry-kcal-input"
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 379"
              value={kcal}
              onChangeText={setKcal}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Grams / day</Text>
            <TextInput
              testID="pantry-grams-input"
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 40"
              value={grams}
              onChangeText={setGrams}
              returnKeyType="done"
            />

            <TouchableOpacity
              testID="pantry-add"
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={styles.addBtnText}>Add staple</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 16, color: colors.monthText },
  title: { fontSize: 18, fontWeight: '700', color: colors.kcalText },
  body: { padding: 24 },
  subtitle: { fontSize: 13, color: colors.monthText, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.kcalText },
  rowMeta: { fontSize: 12, color: colors.monthText, marginTop: 2 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  removeBtnText: { fontSize: 16, color: colors.monthText },
  fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  addBtn: {
    backgroundColor: colors.selectedDay, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- PantryScreen`
Expected: PASS. (All existing testIDs — `pantry-row`, `pantry-remove`, `pantry-name-input`, `pantry-kcal-input`, `pantry-grams-input`, `pantry-add`, `pantry-close` — are preserved.)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all suites.

- [ ] **Step 6: Commit**

```bash
git add src/components/PantryScreen.tsx __tests__/PantryScreen.test.tsx
git commit -m "feat: full-screen Pantry editor"
```

---

## Manual verification (after all tasks)

1. `npx expo start` (or the iPhone build) and open the app.
2. Tap a meal-prep period with items → the lower box shows Basket items, the pill nav (Basket·Extras·Pantry) sits left of the +, and the budget bar shows three colors.
3. Tap **Extras** → period extras list; + adds an extra defaulting to today (or the period's first day).
4. Tap **Pantry** → staples scaled to the period; the + is hidden.
5. Top-right **Pantry** and **Profile** open as full screens with a Back control.

## Notes / decisions captured from the spec

- Tabs appear only once a selected period has items; an empty period still shows `NewPeriodPanel` (unchanged onboarding).
- Extras whose date falls outside any period keep the existing standalone `ExtraMealDetail` flow via `activeExtraDate`.
- The Pantry tab keeps the per-period gram override (slider/input); add/remove of staples stays in the full-screen editor.
- **Deferred from spec §1:** the "tap an extra pill *inside* a period → auto-select that period and jump to the Extras tab" interaction is NOT implemented in this plan. The existing extra-pill flow (`handleExtraPress` → `activeExtraDate` → standalone view) is left untouched to avoid breaking `App.extras.test.tsx`. Extras added inside a period are still visible via the Extras tab; only the auto-navigation shortcut is deferred. Add a follow-up task if you want it.
