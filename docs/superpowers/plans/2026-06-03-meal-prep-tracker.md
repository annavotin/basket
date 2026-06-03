# Meal Prep Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first screen of a meal-prep calorie tracker in Expo/React Native — a horizontally scrolling Gantt-style calendar with meal prep cycle bars and an inline item detail panel, using hardcoded dummy data.

**Architecture:** Single-screen app. `App.tsx` owns `selectedDate` (ISO string) and `activeCycleId` (string | null) state and passes handlers down. A shared horizontal `ScrollView` in `App.tsx` wraps both the calendar day row and the Gantt timeline row so they scroll in sync, using a fixed `DAY_WIDTH` constant so columns align. `MealPrepDetail` renders below the scroll area. Tapping a cycle bar sets `activeCycleId`; tapping it again clears it.

**Tech Stack:** Expo (blank TypeScript template), React Native core, Jest + @testing-library/react-native (included with Expo)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `App.tsx` | Root component; owns state; composes layout |
| `src/types.ts` | TypeScript types: `FoodItem`, `MealPrepCycle`, `ExtraMeal` |
| `src/data.ts` | Hardcoded dummy cycles and extra meals; `DAILY_KCAL_GOAL` constant |
| `src/utils/dates.ts` | Pure date helpers: `addDays`, `daysBetween`, `formatDay`, `isToday`, `dateToIndex` |
| `src/styles/colors.ts` | Color constants matching the green/white mockup palette |
| `src/components/CalendarStrip.tsx` | Renders the day-column row: date cells + "Extra" labels; not scrollable itself |
| `src/components/TimelineView.tsx` | Renders Gantt bars for cycles and Extra meal pills; positioned using `DAY_WIDTH` |
| `src/components/MealPrepDetail.tsx` | Inline panel below the timeline; lists items of the active cycle |
| `__tests__/dates.test.ts` | Unit tests for date utilities |
| `__tests__/CalendarStrip.test.tsx` | Render + interaction tests |
| `__tests__/TimelineView.test.tsx` | Render + interaction tests |
| `__tests__/MealPrepDetail.test.tsx` | Render tests |

---

## Task 1: Bootstrap Expo project

**Files:**
- Create: `basket/` (project root via Expo CLI)

- [ ] **Step 1: Create the Expo project**

In the parent directory (one level above where you want `basket/`):
```bash
npx create-expo-app basket --template blank-typescript
cd basket
```

- [ ] **Step 2: Verify it runs**

```bash
npx expo start --no-dev-client
```
Expected: QR code appears in terminal. Press `Ctrl+C` to stop. (You don't need to scan it yet.)

- [ ] **Step 3: Verify tests run**

```bash
npx jest --passWithNoTests
```
Expected: output ends with `Test Suites: 0 passed` or similar, exit code 0.

- [ ] **Step 4: Create the src folder structure**

```bash
mkdir -p src/utils src/components src/styles __tests__
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Expo TypeScript project"
```

---

## Task 2: Types and dummy data

**Files:**
- Create: `src/types.ts`
- Create: `src/data.ts`

- [ ] **Step 1: Write `src/types.ts`**

```typescript
export type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
}

export type MealPrepCycle = {
  id: string
  startDate: string  // ISO "YYYY-MM-DD"
  endDate: string
  items: FoodItem[]
}

export type ExtraMeal = {
  id: string
  date: string  // ISO "YYYY-MM-DD"
  name: string
  kcal: number
}
```

- [ ] **Step 2: Write `src/data.ts`**

Dates are hardcoded around 2026-06-03 (today at time of writing). The first cycle contains today so the app opens with something visible.

```typescript
import { MealPrepCycle, ExtraMeal } from './types'

export const DAILY_KCAL_GOAL = 2000

export const cycles: MealPrepCycle[] = [
  {
    id: 'cycle-1',
    startDate: '2026-05-31',
    endDate: '2026-06-04',
    items: [
      { name: 'Broccoli', weightG: 600, kcal: 204, emoji: '🥦' },
      { name: 'Spinach', weightG: 300, kcal: 69, emoji: '🥬' },
      { name: 'Chicken Breast', weightG: 800, kcal: 880, emoji: '🍗' },
      { name: 'Brown Rice', weightG: 500, kcal: 650, emoji: '🍚' },
    ],
  },
  {
    id: 'cycle-2',
    startDate: '2026-06-05',
    endDate: '2026-06-09',
    items: [
      { name: 'Salmon', weightG: 600, kcal: 1254, emoji: '🐟' },
      { name: 'Sweet Potato', weightG: 500, kcal: 430, emoji: '🍠' },
      { name: 'Kale', weightG: 200, kcal: 66, emoji: '🥬' },
    ],
  },
]

export const extraMeals: ExtraMeal[] = [
  { id: 'extra-1', date: '2026-06-02', name: 'Protein Bar', kcal: 220 },
  { id: 'extra-2', date: '2026-06-03', name: 'Coffee + Oat Milk', kcal: 90 },
]
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/data.ts
git commit -m "feat: add types and dummy data"
```

---

## Task 3: Date utilities

**Files:**
- Create: `src/utils/dates.ts`
- Create: `__tests__/dates.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/dates.test.ts
import { addDays, daysBetween, formatDay, dateToIndex } from '../src/utils/dates'

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-06-01', 3)).toBe('2026-06-04')
  })
  it('crosses month boundary', () => {
    expect(addDays('2026-05-30', 3)).toBe('2026-06-02')
  })
})

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    expect(daysBetween('2026-06-01', '2026-06-01')).toBe(0)
  })
  it('returns correct positive count', () => {
    expect(daysBetween('2026-06-01', '2026-06-05')).toBe(4)
  })
})

describe('formatDay', () => {
  it('returns day and abbreviated month', () => {
    expect(formatDay('2026-06-03')).toEqual({ day: '3', month: 'Jun' })
  })
  it('handles January', () => {
    expect(formatDay('2026-01-12')).toEqual({ day: '12', month: 'Jan' })
  })
})

describe('dateToIndex', () => {
  it('returns 0 when date equals window start', () => {
    expect(dateToIndex('2026-06-01', '2026-06-01')).toBe(0)
  })
  it('returns correct offset', () => {
    expect(dateToIndex('2026-06-01', '2026-06-04')).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/dates.test.ts
```
Expected: FAIL — `Cannot find module '../src/utils/dates'`

- [ ] **Step 3: Write `src/utils/dates.ts`**

```typescript
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00Z')
  const b = new Date(isoB + 'T00:00:00Z')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function formatDay(isoDate: string): { day: string; month: string } {
  const d = new Date(isoDate + 'T00:00:00Z')
  return { day: String(d.getUTCDate()), month: MONTHS[d.getUTCMonth()] }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function dateToIndex(windowStart: string, date: string): number {
  return daysBetween(windowStart, date)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/dates.test.ts
```
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/dates.ts __tests__/dates.test.ts
git commit -m "feat: add date utility functions"
```

---

## Task 4: Color constants

**Files:**
- Create: `src/styles/colors.ts`

- [ ] **Step 1: Write `src/styles/colors.ts`**

```typescript
export const colors = {
  background: '#E8F5E2',
  surface: '#FFFFFF',
  cycleBar: '#7CC96E',
  cycleBorder: '#5BAF4E',
  selectedDay: '#1A1A1A',
  selectedDayText: '#FFFFFF',
  dayText: '#1A1A1A',
  monthText: '#666666',
  extraPill: '#F7A8C4',
  extraPillText: '#8B0043',
  itemCard: '#F2F2F2',
  detailBackground: '#D4EDCC',
  kcalText: '#3A3A3A',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/colors.ts
git commit -m "feat: add color constants"
```

---

## Task 5: CalendarStrip component

**Files:**
- Create: `src/components/CalendarStrip.tsx`
- Create: `__tests__/CalendarStrip.test.tsx`

The CalendarStrip renders a row of day cells. It does NOT scroll itself — it is rendered inside a parent `ScrollView`. Each cell is `DAY_WIDTH` wide. An "Extra" label appears above a cell if that date has an extra meal.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/CalendarStrip.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import CalendarStrip from '../src/components/CalendarStrip'

const WINDOW_START = '2026-06-01'
const DAYS = 7

describe('CalendarStrip', () => {
  it('renders the correct number of day cells', () => {
    const { getAllByTestId } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        selectedDate="2026-06-03"
        extraDates={[]}
        onDaySelect={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('day-cell')).toHaveLength(DAYS)
  })

  it('calls onDaySelect with the tapped date', () => {
    const onDaySelect = jest.fn()
    const { getAllByTestId } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        selectedDate="2026-06-01"
        extraDates={[]}
        onDaySelect={onDaySelect}
        dayWidth={64}
      />
    )
    fireEvent.press(getAllByTestId('day-cell')[2]) // index 2 = 2026-06-03
    expect(onDaySelect).toHaveBeenCalledWith('2026-06-03')
  })

  it('renders an Extra label on dates with extra meals', () => {
    const { getByText } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        selectedDate="2026-06-01"
        extraDates={['2026-06-02']}
        onDaySelect={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getByText('Extra')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/CalendarStrip.test.tsx
```
Expected: FAIL — `Cannot find module '../src/components/CalendarStrip'`

- [ ] **Step 3: Write `src/components/CalendarStrip.tsx`**

```typescript
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { addDays, formatDay } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  windowStart: string
  totalDays: number
  selectedDate: string
  extraDates: string[]
  onDaySelect: (date: string) => void
  dayWidth: number
}

export default function CalendarStrip({
  windowStart,
  totalDays,
  selectedDate,
  extraDates,
  onDaySelect,
  dayWidth,
}: Props) {
  const days = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))
  const extraSet = new Set(extraDates)

  return (
    <View style={styles.row}>
      {days.map((date) => {
        const { day, month } = formatDay(date)
        const isSelected = date === selectedDate
        const hasExtra = extraSet.has(date)
        return (
          <TouchableOpacity
            key={date}
            testID="day-cell"
            onPress={() => onDaySelect(date)}
            style={[styles.cell, { width: dayWidth }]}
          >
            {hasExtra ? (
              <View style={styles.extraPill}>
                <Text style={styles.extraText}>Extra</Text>
              </View>
            ) : (
              <View style={styles.extraPlaceholder} />
            )}
            <View style={[styles.dateBox, isSelected && styles.dateBoxSelected]}>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day}</Text>
              <Text style={[styles.monthLabel, isSelected && styles.monthLabelSelected]}>{month}</Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
  },
  cell: {
    alignItems: 'center',
  },
  extraPlaceholder: {
    height: 24,
  },
  extraPill: {
    backgroundColor: colors.extraPill,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 24,
    justifyContent: 'center',
  },
  extraText: {
    color: colors.extraPillText,
    fontSize: 11,
    fontWeight: '600',
  },
  dateBox: {
    width: 48,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dateBoxSelected: {
    backgroundColor: colors.selectedDay,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dayText,
  },
  dayNumSelected: {
    color: colors.selectedDayText,
  },
  monthLabel: {
    fontSize: 12,
    color: colors.monthText,
  },
  monthLabelSelected: {
    color: colors.selectedDayText,
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/CalendarStrip.test.tsx
```
Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarStrip.tsx __tests__/CalendarStrip.test.tsx
git commit -m "feat: add CalendarStrip component"
```

---

## Task 6: TimelineView component

**Files:**
- Create: `src/components/TimelineView.tsx`
- Create: `__tests__/TimelineView.test.tsx`

TimelineView renders absolutely-positioned bars for each cycle and small pills for extra meals, over a row of invisible column spacers. It is rendered inside the same parent `ScrollView` as CalendarStrip.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/TimelineView.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import TimelineView from '../src/components/TimelineView'
import { cycles, extraMeals } from '../src/data'

const WINDOW_START = '2026-05-28'

describe('TimelineView', () => {
  it('renders a bar for each cycle', () => {
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        extraMeals={extraMeals}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('cycle-bar')).toHaveLength(cycles.length)
  })

  it('renders a pill for each extra meal', () => {
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        extraMeals={extraMeals}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('extra-pill')).toHaveLength(extraMeals.length)
  })

  it('calls onCyclePress with the cycle id when a bar is tapped', () => {
    const onCyclePress = jest.fn()
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        extraMeals={extraMeals}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={onCyclePress}
        dayWidth={64}
      />
    )
    fireEvent.press(getAllByTestId('cycle-bar')[0])
    expect(onCyclePress).toHaveBeenCalledWith(cycles[0].id)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/TimelineView.test.tsx
```
Expected: FAIL — `Cannot find module '../src/components/TimelineView'`

- [ ] **Step 3: Write `src/components/TimelineView.tsx`**

```typescript
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle, ExtraMeal } from '../types'
import { dateToIndex, daysBetween } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  cycles: MealPrepCycle[]
  extraMeals: ExtraMeal[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
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
  dayWidth,
}: Props) {
  const totalWidth = totalDays * dayWidth

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {cycles.map((cycle) => {
        const startIdx = dateToIndex(windowStart, cycle.startDate)
        const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
        const left = startIdx * dayWidth
        const width = spanDays * dayWidth - 4
        const isActive = cycle.id === activeCycleId
        return (
          <TouchableOpacity
            key={cycle.id}
            testID="cycle-bar"
            onPress={() => onCyclePress(cycle.id)}
            style={[
              styles.bar,
              { left, width, top: EXTRA_HEIGHT + 8 },
              isActive && styles.barActive,
            ]}
          >
            <Text style={styles.barLabel} numberOfLines={1}>Meal Prep</Text>
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
  barActive: {
    borderWidth: 2,
    borderColor: colors.selectedDay,
  },
  barLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/TimelineView.test.tsx
```
Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TimelineView.tsx __tests__/TimelineView.test.tsx
git commit -m "feat: add TimelineView component"
```

---

## Task 7: MealPrepDetail component

**Files:**
- Create: `src/components/MealPrepDetail.tsx`
- Create: `__tests__/MealPrepDetail.test.tsx`

Renders below the timeline. Shows a list of food items for the active cycle. Renders nothing if `activeCycle` is null.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/MealPrepDetail.test.tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import MealPrepDetail from '../src/components/MealPrepDetail'
import { cycles } from '../src/data'

describe('MealPrepDetail', () => {
  it('renders nothing when activeCycle is null', () => {
    const { toJSON } = render(<MealPrepDetail activeCycle={null} />)
    expect(toJSON()).toBeNull()
  })

  it('renders an item card for each food item', () => {
    const { getAllByTestId } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getAllByTestId('food-item')).toHaveLength(cycles[0].items.length)
  })

  it('displays the food item name', () => {
    const { getByText } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getByText('Broccoli')).toBeTruthy()
  })

  it('displays weight and kcal', () => {
    const { getByText } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getByText('600g  204kcal')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/MealPrepDetail.test.tsx
```
Expected: FAIL — `Cannot find module '../src/components/MealPrepDetail'`

- [ ] **Step 3: Write `src/components/MealPrepDetail.tsx`**

```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { colors } from '../styles/colors'

type Props = {
  activeCycle: MealPrepCycle | null
}

export default function MealPrepDetail({ activeCycle }: Props) {
  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeCycle.items.map((item, idx) => (
          <View key={idx} testID="food-item" style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.weightG}g  {item.kcal}kcal</Text>
            </View>
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
  emoji: {
    fontSize: 32,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.kcalText,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: colors.monthText,
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/MealPrepDetail.test.tsx
```
Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/MealPrepDetail.tsx __tests__/MealPrepDetail.test.tsx
git commit -m "feat: add MealPrepDetail component"
```

---

## Task 8: Wire App.tsx

**Files:**
- Modify: `App.tsx`

Compose all components. The shared horizontal `ScrollView` wraps a fixed-width container holding `CalendarStrip` stacked above `TimelineView`. `MealPrepDetail` renders below. On mount, scroll to today's position and set `activeCycleId` to the cycle containing today (if any).

- [ ] **Step 1: Replace `App.tsx` with the following**

```typescript
import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  StyleSheet,
} from 'react-native'
import CalendarStrip from './src/components/CalendarStrip'
import TimelineView from './src/components/TimelineView'
import MealPrepDetail from './src/components/MealPrepDetail'
import { cycles, extraMeals } from './src/data'
import { todayISO, addDays, daysBetween } from './src/utils/dates'
import { colors } from './src/styles/colors'

const DAY_WIDTH = 64
const TOTAL_DAYS = 45
const WINDOW_OFFSET = 7  // days before today the window starts

function getWindowStart(): string {
  return addDays(todayISO(), -WINDOW_OFFSET)
}

function findCycleForDate(date: string): string | null {
  const cycle = cycles.find(
    (c) => date >= c.startDate && date <= c.endDate
  )
  return cycle?.id ?? null
}

export default function App() {
  const windowStart = getWindowStart()
  const today = todayISO()

  const [selectedDate, setSelectedDate] = useState(today)
  const [activeCycleId, setActiveCycleId] = useState<string | null>(
    () => findCycleForDate(today)
  )
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const todayIndex = daysBetween(windowStart, today)
    const scrollX = Math.max(0, (todayIndex - 3) * DAY_WIDTH)
    scrollRef.current?.scrollTo({ x: scrollX, animated: false })
  }, [])

  function handleDaySelect(date: string) {
    setSelectedDate(date)
  }

  function handleCyclePress(id: string) {
    setActiveCycleId((prev) => (prev === id ? null : id))
  }

  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const extraDates = extraMeals.map((e) => e.date)

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={{ width: TOTAL_DAYS * DAY_WIDTH }}
        >
          <CalendarStrip
            windowStart={windowStart}
            totalDays={TOTAL_DAYS}
            selectedDate={selectedDate}
            extraDates={extraDates}
            onDaySelect={handleDaySelect}
            dayWidth={DAY_WIDTH}
          />
          <TimelineView
            cycles={cycles}
            extraMeals={extraMeals}
            windowStart={windowStart}
            totalDays={TOTAL_DAYS}
            activeCycleId={activeCycleId}
            onCyclePress={handleCyclePress}
            dayWidth={DAY_WIDTH}
          />
        </ScrollView>
        <MealPrepDetail activeCycle={activeCycle} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#1A1A1A',
  },
  horizontalScroll: {
    flexGrow: 0,
  },
})
```

- [ ] **Step 2: Run all tests**

```bash
npx jest
```
Expected: all tests PASS (dates + CalendarStrip + TimelineView + MealPrepDetail)

- [ ] **Step 3: Start the app and verify on device**

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your iPhone. Verify:
- Calendar opens on today (highlighted)
- Two Gantt bars are visible (Meal Prep cycle 1 and 2)
- Cycle 1 bar is visible and today falls within it
- Tapping cycle 1 bar opens the detail panel with Broccoli, Spinach, Chicken Breast, Brown Rice
- Tapping the same bar again collapses the detail panel
- Extra meal pills are visible on June 2 and June 3
- Horizontal scrolling works smoothly

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: wire up App with calendar, timeline, and detail panel"
```
