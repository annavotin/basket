# New Meal Prep Period — Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the user create a new meal prep period by tapping an empty day in the timeline, which opens a "New shop" panel with a day-count slider and (stub) Scan Barcode / Scan Receipt buttons. The new period appears as an outlined bar spanning the chosen number of days.

**Architecture:** `cycles` becomes React state in `App.tsx` (seeded from the dummy data) so new periods can be appended. Tapping an uncovered day in `TimelineView` calls `onCreatePeriod(date)`, which creates an empty cycle (4 days default) and selects it. The detail area branches: a cycle **with** items shows the existing `MealPrepDetail` food list; a cycle with **no** items (a newly created period) shows the new `NewPeriodPanel`. The slider edits the active empty cycle's length live.

**Tech Stack:** Expo SDK 54, React Native, `@react-native-community/slider` (new dep), Jest + @testing-library/react-native.

---

## Scope / YAGNI

**In scope:** create a new (empty) meal prep period of a chosen length (1–7 days, default 4); render it as a distinct outlined bar; "New shop" panel with day slider; Scan buttons as visual stubs.

**Out of scope (do NOT build):** actual barcode/receipt scanning (Scan buttons just trigger an "Coming soon" Alert), adding food items to a period, persistence across reloads, the per-day "+" extra-meal affordance in the calendar strip, deleting periods, overlap prevention beyond "can't start on a covered day".

---

## Constants

In `App.tsx`: `DEFAULT_DAYS = 4`. In `NewPeriodPanel.tsx`: `MIN_DAYS = 1`, `MAX_DAYS = 7`.

---

## Task 1: Install slider dependency + Jest mock

**Files:**
- Modify: `package.json` (via expo install)
- Create: `__mocks__/@react-native-community/slider.js`

- [ ] **Step 1: Install the slider**

```bash
cd "/Users/annavotin/personal/coding proj/basket"
npx expo install @react-native-community/slider
```
Expected: package added, no fatal errors.

- [ ] **Step 2: Create the Jest manual mock** (so tests don't need the native module)

`__mocks__/@react-native-community/slider.js`:
```js
const React = require('react')
const { View } = require('react-native')
// Manual mock for node_modules package — Jest picks this up automatically.
// Renders a View that forwards all props (including testID and onValueChange),
// so tests can fire `valueChange` on it.
module.exports = (props) => React.createElement(View, props)
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx jest
```
Expected: 18 tests pass (the mock isn't used yet, just present).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json "__mocks__/@react-native-community/slider.js"
git commit -m "chore: add @react-native-community/slider and jest mock"
```

---

## Task 2: NewPeriodPanel component (TDD)

**Files:**
- Create: `src/components/NewPeriodPanel.tsx`
- Create: `__tests__/NewPeriodPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

`__tests__/NewPeriodPanel.test.tsx`:
```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import NewPeriodPanel from '../src/components/NewPeriodPanel'

function setup(overrides = {}) {
  const props = {
    dayCount: 4,
    onDaysChange: jest.fn(),
    onScanBarcode: jest.fn(),
    onScanReceipt: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<NewPeriodPanel {...props} />) }
}

describe('NewPeriodPanel', () => {
  it('renders the New shop title', () => {
    const { getByText } = setup()
    expect(getByText('New shop')).toBeTruthy()
  })

  it('shows the day count with correct pluralization', () => {
    const { getByText } = setup({ dayCount: 4 })
    expect(getByText('4 days')).toBeTruthy()
  })

  it('uses singular for one day', () => {
    const { getByText } = setup({ dayCount: 1 })
    expect(getByText('1 day')).toBeTruthy()
  })

  it('renders both scan buttons', () => {
    const { getByTestId } = setup()
    expect(getByTestId('scan-barcode')).toBeTruthy()
    expect(getByTestId('scan-receipt')).toBeTruthy()
  })

  it('calls onScanBarcode when the barcode button is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('scan-barcode'))
    expect(props.onScanBarcode).toHaveBeenCalled()
  })

  it('calls onScanReceipt when the receipt button is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('scan-receipt'))
    expect(props.onScanReceipt).toHaveBeenCalled()
  })

  it('calls onDaysChange (rounded) when the slider value changes', () => {
    const { props, getByTestId } = setup()
    fireEvent(getByTestId('day-slider'), 'valueChange', 6)
    expect(props.onDaysChange).toHaveBeenCalledWith(6)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail** (`Cannot find module '../src/components/NewPeriodPanel'`)

```bash
npx jest __tests__/NewPeriodPanel.test.tsx
```

- [ ] **Step 3: Implement `src/components/NewPeriodPanel.tsx`**

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Slider from '@react-native-community/slider'
import { colors } from '../styles/colors'

export const MIN_DAYS = 1
export const MAX_DAYS = 7

type Props = {
  dayCount: number
  onDaysChange: (days: number) => void
  onScanBarcode: () => void
  onScanReceipt: () => void
}

export default function NewPeriodPanel({
  dayCount,
  onDaysChange,
  onScanBarcode,
  onScanReceipt,
}: Props) {
  return (
    <View style={styles.container} testID="new-period-panel">
      <View style={styles.header}>
        <Text style={styles.bag}>🛍️</Text>
        <Text style={styles.title}>New shop</Text>
      </View>

      <Text style={styles.daysLabel}>
        {dayCount} {dayCount === 1 ? 'day' : 'days'}
      </Text>
      <Slider
        testID="day-slider"
        style={styles.slider}
        minimumValue={MIN_DAYS}
        maximumValue={MAX_DAYS}
        step={1}
        value={dayCount}
        onValueChange={(v) => onDaysChange(Math.round(v))}
        minimumTrackTintColor={colors.selectedDay}
        maximumTrackTintColor="#CCCCCC"
        thumbTintColor={colors.selectedDay}
      />

      <View style={styles.scanRow}>
        <TouchableOpacity testID="scan-barcode" style={styles.scanCard} onPress={onScanBarcode}>
          <Text style={styles.scanText}>Scan{'\n'}Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="scan-receipt" style={styles.scanCard} onPress={onScanReceipt}>
          <Text style={styles.scanText}>Scan{'\n'}Receipt</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.detailBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    flex: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  bag: {
    fontSize: 44,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.kcalText,
  },
  daysLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.kcalText,
    marginBottom: 4,
  },
  slider: {
    width: '85%',
    height: 40,
    marginBottom: 20,
  },
  scanRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  scanCard: {
    flex: 1,
    backgroundColor: colors.itemCard,
    borderRadius: 16,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.kcalText,
    textAlign: 'center',
  },
})
```

- [ ] **Step 4: Run tests, verify all 7 pass**

```bash
npx jest __tests__/NewPeriodPanel.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/NewPeriodPanel.tsx __tests__/NewPeriodPanel.test.tsx
git commit -m "feat: add NewPeriodPanel with day slider and scan stubs"
```

---

## Task 3: TimelineView — empty-day slots + new-cycle styling (TDD)

**Files:**
- Modify: `src/components/TimelineView.tsx`
- Modify: `__tests__/TimelineView.test.tsx`

The timeline must (a) render a tappable "empty slot" for every day not covered by a cycle, calling `onCreatePeriod(date)`, and (b) style empty cycles (`items.length === 0`) as outlined "New shop" bars instead of solid "Meal Prep" bars.

- [ ] **Step 1: Update the existing tests to pass the new required prop, and add new tests**

In `__tests__/TimelineView.test.tsx`, add `onCreatePeriod={jest.fn()}` to all THREE existing `<TimelineView ... />` renders. Then append this new describe block:

```tsx
describe('TimelineView empty slots', () => {
  const oneCycle = [
    {
      id: 'c1',
      startDate: '2026-06-02',
      endDate: '2026-06-03',
      items: [{ name: 'X', weightG: 1, kcal: 1, emoji: '🥦' }],
    },
  ]

  it('renders an empty slot for each uncovered day', () => {
    // window 2026-06-01 .. 2026-06-05 (5 days); cycle covers 06-02 and 06-03
    // => uncovered: 06-01, 06-04, 06-05 = 3 slots
    const { getAllByTestId } = render(
      <TimelineView
        cycles={oneCycle}
        extraMeals={[]}
        windowStart="2026-06-01"
        totalDays={5}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('empty-slot')).toHaveLength(3)
  })

  it('calls onCreatePeriod with the tapped day', () => {
    const onCreatePeriod = jest.fn()
    const { getAllByTestId } = render(
      <TimelineView
        cycles={oneCycle}
        extraMeals={[]}
        windowStart="2026-06-01"
        totalDays={5}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={onCreatePeriod}
        dayWidth={64}
      />
    )
    // first empty slot corresponds to 2026-06-01
    fireEvent.press(getAllByTestId('empty-slot')[0])
    expect(onCreatePeriod).toHaveBeenCalledWith('2026-06-01')
  })

  it('labels an empty cycle as New shop', () => {
    const emptyCycle = [
      { id: 'new1', startDate: '2026-06-02', endDate: '2026-06-04', items: [] },
    ]
    const { getByText } = render(
      <TimelineView
        cycles={emptyCycle}
        extraMeals={[]}
        windowStart="2026-06-01"
        totalDays={6}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getByText('New shop')).toBeTruthy()
  })
})
```

Make sure `fireEvent` is imported in the test file (it already is).

- [ ] **Step 2: Run tests, verify the new ones fail** (empty-slot not rendered yet)

```bash
npx jest __tests__/TimelineView.test.tsx
```

- [ ] **Step 3: Modify `src/components/TimelineView.tsx`**

Changes:
1. Add `addDays` to the dates import: `import { dateToIndex, daysBetween, addDays } from '../utils/dates'`
2. Add `onCreatePeriod: (startDate: string) => void` to `Props`.
3. Destructure `onCreatePeriod`.
4. Build a covered-day set and render empty slots.
5. Make the bar label/style depend on whether the cycle is empty.

Full updated file:
```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle, ExtraMeal } from '../types'
import { dateToIndex, daysBetween, addDays } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  cycles: MealPrepCycle[]
  extraMeals: ExtraMeal[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
  onCreatePeriod: (startDate: string) => void
  dayWidth: number
}

const BAR_HEIGHT = 36
const EXTRA_HEIGHT = 24
const ROW_HEIGHT = BAR_HEIGHT + EXTRA_HEIGHT + 16

export default function TimelineView({
  cycles,
  extraMeals,
  windowStart,
  totalDays,
  activeCycleId,
  onCyclePress,
  onCreatePeriod,
  dayWidth,
}: Props) {
  const totalWidth = totalDays * dayWidth

  // Set of ISO dates covered by an existing cycle.
  const covered = new Set<string>()
  cycles.forEach((cycle) => {
    const span = daysBetween(cycle.startDate, cycle.endDate)
    for (let d = 0; d <= span; d++) {
      covered.add(addDays(cycle.startDate, d))
    }
  })

  const allDays = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {allDays.map((date, i) => {
        if (covered.has(date)) return null
        return (
          <TouchableOpacity
            key={`slot-${date}`}
            testID="empty-slot"
            onPress={() => onCreatePeriod(date)}
            style={[
              styles.emptySlot,
              { left: i * dayWidth, width: dayWidth, top: EXTRA_HEIGHT + 8 },
            ]}
          >
            <Text style={styles.plus}>+</Text>
          </TouchableOpacity>
        )
      })}

      {cycles.map((cycle) => {
        const startIdx = dateToIndex(windowStart, cycle.startDate)
        const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
        const left = startIdx * dayWidth
        const width = spanDays * dayWidth - 4
        const isActive = cycle.id === activeCycleId
        const isEmpty = cycle.items.length === 0
        return (
          <TouchableOpacity
            key={cycle.id}
            testID="cycle-bar"
            onPress={() => onCyclePress(cycle.id)}
            style={[
              styles.bar,
              { left, width, top: EXTRA_HEIGHT + 8 },
              isEmpty && styles.barNew,
              isActive && styles.barActive,
            ]}
          >
            <Text style={[styles.barLabel, isEmpty && styles.barLabelNew]} numberOfLines={1}>
              {isEmpty ? 'New shop' : 'Meal Prep'}
            </Text>
          </TouchableOpacity>
        )
      })}

      {extraMeals.map((extra) => {
        const idx = dateToIndex(windowStart, extra.date)
        const left = idx * dayWidth + 4
        return (
          <View
            key={extra.id}
            testID="extra-pill"
            style={[styles.extraPill, { left, top: 4 }]}
          >
            <Text style={styles.extraPillText} numberOfLines={1}>{extra.name}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  emptySlot: {
    position: 'absolute',
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: colors.cycleBorder,
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.5,
  },
  bar: {
    position: 'absolute',
    height: BAR_HEIGHT,
    backgroundColor: colors.cycleBar,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cycleBorder,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  barNew: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.cycleBorder,
  },
  barActive: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.selectedDay,
  },
  barLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  barLabelNew: {
    color: colors.cycleBorder,
  },
  extraPill: {
    position: 'absolute',
    height: EXTRA_HEIGHT,
    backgroundColor: colors.extraPill,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    maxWidth: 120,
  },
  extraPillText: {
    color: colors.extraPillText,
    fontSize: 11,
    fontWeight: '500',
  },
})
```

- [ ] **Step 4: Run tests, verify all TimelineView tests pass**

```bash
npx jest __tests__/TimelineView.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/TimelineView.tsx __tests__/TimelineView.test.tsx
git commit -m "feat: timeline empty-day slots and new-period bar styling"
```

---

## Task 4: Wire creation flow into App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Apply these changes to `App.tsx`**

1. Update imports:
   - Add `Alert` to the react-native import.
   - Change the data import to alias cycles: `import { cycles as initialCycles, extraMeals } from './src/data'`
   - Add the panel import: `import NewPeriodPanel from './src/components/NewPeriodPanel'`
   - Ensure `addDays` and `daysBetween` are imported from dates (they already are alongside `todayISO`).
2. Add `const DEFAULT_DAYS = 4` near the other top-level constants.
3. Replace the body's cycle handling. `findCycleForDate` currently closes over the imported `cycles`; move that lookup to use state. Concretely:

Replace the component body's state + handlers region so it reads:
```tsx
export default function App() {
  const today = useMemo(() => todayISO(), [])
  const windowStart = useMemo(() => getWindowStart(), [])

  const [cycles, setCycles] = useState(initialCycles)
  const [activeCycleId, setActiveCycleId] = useState<string | null>(
    () => initialCycles.find((c) => today >= c.startDate && today <= c.endDate)?.id ?? null
  )
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const todayIndex = daysBetween(windowStart, today)
    const scrollX = Math.max(0, (todayIndex - 3) * DAY_WIDTH)
    scrollRef.current?.scrollTo({ x: scrollX, animated: false })
  }, [])

  function handleCyclePress(id: string) {
    setActiveCycleId((prev) => (prev === id ? null : id))
  }

  function handleCreatePeriod(startDate: string) {
    const id = `cycle-${Date.now()}`
    const newCycle = {
      id,
      startDate,
      endDate: addDays(startDate, DEFAULT_DAYS - 1),
      items: [],
    }
    setCycles((prev) => [...prev, newCycle])
    setActiveCycleId(id)
  }

  function handleChangeDays(days: number) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? { ...c, endDate: addDays(c.startDate, days - 1) }
          : c
      )
    )
  }

  function handleScanComingSoon() {
    Alert.alert('Coming soon', 'Shopping is not implemented yet.')
  }

  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const extraDates = extraMeals.map((e) => e.date)
  const activeDayCount = activeCycle
    ? daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    : DEFAULT_DAYS
```

4. Remove the now-unused module-level `findCycleForDate` function (its logic moved inline into the `useState` initializer above). Keep `getWindowStart`.

5. Pass `onCreatePeriod` to `<TimelineView />`:
```tsx
            <TimelineView
              cycles={cycles}
              extraMeals={extraMeals}
              windowStart={windowStart}
              totalDays={TOTAL_DAYS}
              activeCycleId={activeCycleId}
              onCyclePress={handleCyclePress}
              onCreatePeriod={handleCreatePeriod}
              dayWidth={DAY_WIDTH}
            />
```

6. Replace the single `<MealPrepDetail activeCycle={activeCycle} />` line with the branching detail area:
```tsx
        {activeCycle && activeCycle.items.length > 0 && (
          <MealPrepDetail activeCycle={activeCycle} />
        )}
        {activeCycle && activeCycle.items.length === 0 && (
          <NewPeriodPanel
            dayCount={activeDayCount}
            onDaysChange={handleChangeDays}
            onScanBarcode={handleScanComingSoon}
            onScanReceipt={handleScanComingSoon}
          />
        )}
```

- [ ] **Step 2: Type-check and run the full suite**

```bash
npx tsc --noEmit
npx jest
```
Expected: tsc clean; all tests pass (dates 8, CalendarStrip 3, TimelineView 6, MealPrepDetail 4, NewPeriodPanel 7 = 28).

- [ ] **Step 3: Verify the bundle builds for BOTH platforms (do NOT run `expo start`)**

```bash
rm -rf /tmp/basket-verify
npx expo export --platform ios --output-dir /tmp/basket-verify-ios
npx expo export --platform web --output-dir /tmp/basket-verify-web
```
Expected: both export with "Bundled ... index.ts" and no errors. Then `rm -rf /tmp/basket-verify-ios /tmp/basket-verify-web`.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: wire new meal prep period creation flow into App"
```

---

## Verification Checklist (for the executor's final self-review)

- [ ] `npx tsc --noEmit` clean
- [ ] `npx jest` — all 28 tests pass
- [ ] `npx expo export` succeeds for ios AND web
- [ ] No `expo start` was run (it blocks)
- [ ] Existing behavior intact: filled cycles still show the food list; tapping a filled bar toggles it
- [ ] New behavior: tapping an empty slot adds an outlined "New shop" bar and opens the NewPeriodPanel; the slider's value reflects the bar length

**Do NOT run `npx expo start` or any long-running/watch command — it will hang.** Use `expo export` for bundle verification.
