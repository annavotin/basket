# Timeline Period Gestures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Long-press a meal-prep period on the timeline to "pick it up" into an edit mode, then drag to move it, drag the front/back handles to resize, or tap Delete — with whole-day snapping, min-1-day, no overlap, and within-window clamping.

**Architecture:** A pure `timelineDrag` helper (day-index math: move/resize clamping + overlap) is unit-tested. App gains `handleSetCycleDates(id, start, end)`, a generalized `handleDeleteCycle(id)`, and a scroll-lock flag wired to the calendar `ScrollView`. `TimelineView` gains edit mode: long-press → lift + handles + Delete + tap-away backdrop, with `PanResponder`s converting pixel drags → day deltas → the helper → dates.

**Tech Stack:** React Native (`PanResponder`, `Animated`), TypeScript, Jest + @testing-library/react-native. Drag gestures are device-verified (jest can't run them); the long-press → edit → Delete path and the helper are unit-tested.

**Conventions:** TDD; `npx jest` (NEVER `npx expo start`); commit to `main`. Preserve existing TimelineView testIDs (`cycle-bar`, `create-period`) + the tap/`+`-tile behaviour.

---

## Task 1: `timelineDrag` clamp helper (pure, unit-tested)

**Files:** Create `src/utils/timelineDrag.ts`; Test `__tests__/timelineDrag.test.ts`.

Day indices are 0-based offsets from `windowStart`; ranges are inclusive `{ start, end }`.

- [ ] **Step 1: Write the failing test** — `__tests__/timelineDrag.test.ts`:

```ts
import { clampMove, clampResizeStart, clampResizeEnd } from '../src/utils/timelineDrag'

describe('clampMove', () => {
  it('shifts start+end together by the day delta', () => {
    expect(clampMove(5, 8, +2, 45, [])).toEqual({ start: 7, end: 10 })
    expect(clampMove(5, 8, -3, 45, [])).toEqual({ start: 2, end: 5 })
  })
  it('clamps to the window edges (keeps span)', () => {
    expect(clampMove(2, 4, -10, 45, [])).toEqual({ start: 0, end: 2 })
    expect(clampMove(40, 43, +10, 45, [])).toEqual({ start: 41, end: 44 }) // span 3, last idx 44
  })
  it('stops at a neighbour on the right and on the left', () => {
    const right = [{ start: 10, end: 12 }]
    expect(clampMove(5, 7, +20, 45, right)).toEqual({ start: 7, end: 9 }) // end must stay < 10
    const left = [{ start: 0, end: 3 }]
    expect(clampMove(6, 8, -20, 45, left)).toEqual({ start: 4, end: 6 }) // start must stay > 3
  })
})

describe('clampResizeStart (end fixed, min 1 day)', () => {
  it('moves the start within bounds', () => {
    expect(clampResizeStart(5, 8, -2, [])).toBe(3)
    expect(clampResizeStart(5, 8, +2, [])).toBe(7)
  })
  it('cannot cross the end (min 1 day) or go below 0 / a left neighbour', () => {
    expect(clampResizeStart(5, 8, +99, [])).toBe(8)            // start can equal end (1 day)
    expect(clampResizeStart(5, 8, -99, [])).toBe(0)
    expect(clampResizeStart(6, 8, -99, [{ start: 0, end: 3 }])).toBe(4) // left neighbour ends at 3
  })
})

describe('clampResizeEnd (start fixed, min 1 day)', () => {
  it('moves the end within bounds', () => {
    expect(clampResizeEnd(5, 8, +2, 45, [])).toBe(10)
    expect(clampResizeEnd(5, 8, -2, 45, [])).toBe(6)
  })
  it('cannot cross the start (min 1 day) or pass the window / a right neighbour', () => {
    expect(clampResizeEnd(5, 8, -99, 45, [])).toBe(5)          // end can equal start
    expect(clampResizeEnd(5, 8, +99, 45, [])).toBe(44)
    expect(clampResizeEnd(5, 8, +99, 45, [{ start: 12, end: 20 }])).toBe(11) // right neighbour starts at 12
  })
})
```

- [ ] **Step 2: Run it — FAIL.** `npx jest timelineDrag` (module not found).

- [ ] **Step 3: Create `src/utils/timelineDrag.ts`:**

```ts
export type Range = { start: number; end: number } // inclusive day indices

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

// Nearest free index to the left/right, given non-overlapping `occupied` ranges.
function leftBound(start: number, occupied: Range[]): number {
  let lb = 0
  for (const r of occupied) if (r.end < start && r.end + 1 > lb) lb = r.end + 1
  return lb
}
function rightBound(end: number, totalDays: number, occupied: Range[]): number {
  let rb = totalDays - 1
  for (const r of occupied) if (r.start > end && r.start - 1 < rb) rb = r.start - 1
  return rb
}

/** Move the [start,end] block by `dayDelta`, keeping its span, clamped to the window and to the
 *  gap between neighbouring occupied ranges (can't jump over an adjacent prep). */
export function clampMove(start: number, end: number, dayDelta: number, totalDays: number, occupied: Range[]): Range {
  const span = end - start
  const lb = leftBound(start, occupied)
  const rb = rightBound(end, totalDays, occupied)
  const s = clamp(start + dayDelta, lb, rb - span)
  return { start: s, end: s + span }
}

/** New start (end fixed): clamped to >=0 / left neighbour, and <= end (min 1 day). */
export function clampResizeStart(start: number, end: number, dayDelta: number, occupied: Range[]): number {
  return clamp(start + dayDelta, leftBound(start, occupied), end)
}

/** New end (start fixed): clamped to >= start (min 1 day), and <= window / right neighbour. */
export function clampResizeEnd(start: number, end: number, dayDelta: number, totalDays: number, occupied: Range[]): number {
  return clamp(end + dayDelta, start, rightBound(end, totalDays, occupied))
}
```

- [ ] **Step 4: Run it — PASS.** `npx jest timelineDrag`.

- [ ] **Step 5: Commit.**
```bash
git add src/utils/timelineDrag.ts __tests__/timelineDrag.test.ts
git commit -m "feat: timelineDrag clamp helper (move/resize, snap + no-overlap)"
```

---

## Task 2: App handlers + scroll-lock + TimelineView prop plumbing

**Files:** Modify `App.tsx`, `src/components/TimelineView.tsx` (Props type only).

- [ ] **Step 1: Add the date handler in `App.tsx`** (near `handleChangeDays`):
```tsx
  function handleSetCycleDates(id: string, startDate: string, endDate: string) {
    setCycles((prev) => prev.map((c) => (c.id === id ? touch({ ...c, startDate, endDate }) : c)))
    markDirty('cycles', id)
  }
```

- [ ] **Step 2: Generalize `handleDeleteCycle` to take an id.** Replace the existing function with:
```tsx
  function handleDeleteCycle(id: string) {
    Alert.alert('Delete this basket?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setCycles((prev) => prev.map((c) => (c.id === id ? tombstone(c) : c)))
          markDirty('cycles', id)
          if (activeCycleId === id) setActiveCycleId(null)
        },
      },
    ])
  }
```
Then update the existing caller (the BasketOptions ⋮ delete): find `onDelete={() => { setBasketOptionsOpen(false); handleDeleteCycle() }}` and change it to `handleDeleteCycle(activeCycleId!)` (that sheet only renders when `activeCycle` exists). Run `grep -n "handleDeleteCycle(" App.tsx` → both call sites now pass an id.

- [ ] **Step 3: Add the scroll-lock state** near the other `useState`s:
```tsx
  const [timelineEditing, setTimelineEditing] = useState(false)
```
On the calendar's horizontal `<ScrollView … horizontal …>` (the one wrapping `CalendarStrip`), add `scrollEnabled={!timelineEditing}`.

- [ ] **Step 4: Pass the new props to `<TimelineView … />`:**
```tsx
            onSetCycleDates={handleSetCycleDates}
            onDeleteCycle={handleDeleteCycle}
            onEditingChange={setTimelineEditing}
```

- [ ] **Step 5: Extend `TimelineView`'s `Props` type** (do not change rendering yet) to add:
```tsx
  onSetCycleDates: (id: string, startDate: string, endDate: string) => void
  onDeleteCycle: (id: string) => void
  onEditingChange: (editing: boolean) => void
```
Destructure them in the component signature (unused for now is fine — Task 3 uses them; prefix-free since Task 3 wires them immediately).

- [ ] **Step 6: Verify** — `npx jest` green (the existing TimelineView tests pass `onCyclePress`/`onCreatePeriod`; they'll now need the new required props OR make the three new props optional with `?`). **Decision:** make the three new props **required** and update `__tests__/TimelineView.test.tsx` + any App test render to pass them (`onSetCycleDates={jest.fn()} onDeleteCycle={jest.fn()} onEditingChange={jest.fn()}`). Run `npx jest TimelineView App` → green. `npx tsc --noEmit 2>&1 | grep -E "App\.tsx|TimelineView" || echo clean`.

- [ ] **Step 7: Commit.**
```bash
git add App.tsx src/components/TimelineView.tsx __tests__
git commit -m "feat: App handlers (set-cycle-dates, delete-by-id) + timeline scroll-lock plumbing"
```

---

## Task 3: TimelineView edit mode (long-press → move / resize / delete)

**Files:** Modify `src/components/TimelineView.tsx`; Test `__tests__/TimelineView.test.tsx`.

Implements the interaction using Task 1's helper + Task 2's props. **Drag is device-verified;** the long-press → edit → Delete path + `onEditingChange` are unit-tested.

- [ ] **Step 1: Write the failing tests** (append to `__tests__/TimelineView.test.tsx`):

```tsx
describe('TimelineView — edit mode', () => {
  const oneCycle = [{ id: 'c1', startDate: '2026-06-02', endDate: '2026-06-04', items: [{ name: 'X', weightG: 1, kcal: 1, emoji: '🥦' }] }]
  const props = {
    windowStart: '2026-06-01', totalDays: 10, activeCycleId: null, dayWidth: 64,
    onCyclePress: jest.fn(), onCreatePeriod: jest.fn(),
    onSetCycleDates: jest.fn(), onDeleteCycle: jest.fn(), onEditingChange: jest.fn(),
  }

  it('long-press enters edit mode (reports editing + shows Delete) and Delete fires onDeleteCycle(id)', () => {
    const onEditingChange = jest.fn(); const onDeleteCycle = jest.fn()
    const { getAllByTestId, getByTestId, queryByTestId } = render(
      <TimelineView {...props} cycles={oneCycle} onEditingChange={onEditingChange} onDeleteCycle={onDeleteCycle} />
    )
    expect(queryByTestId('delete-period')).toBeNull()
    fireEvent(getAllByTestId('cycle-bar')[0], 'longPress')
    expect(onEditingChange).toHaveBeenCalledWith(true)
    fireEvent.press(getByTestId('delete-period'))
    expect(onDeleteCycle).toHaveBeenCalledWith('c1')
  })

  it('a short tap still fires onCyclePress (not edit mode)', () => {
    const onCyclePress = jest.fn(); const onEditingChange = jest.fn()
    const { getAllByTestId } = render(
      <TimelineView {...props} cycles={oneCycle} onCyclePress={onCyclePress} onEditingChange={onEditingChange} />
    )
    fireEvent.press(getAllByTestId('cycle-bar')[0])
    expect(onCyclePress).toHaveBeenCalledWith('c1')
    expect(onEditingChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — FAIL** (`delete-period` not found / no edit mode). `npx jest TimelineView -t "edit mode"`

- [ ] **Step 3: Implement edit mode in `TimelineView.tsx`.** Add `import { PanResponder, Animated } from 'react-native'` and `import { clampMove, clampResizeStart, clampResizeEnd, Range } from '../utils/timelineDrag'`. Add state `const [editingId, setEditingId] = useState<string | null>(null)`. Helpers:

```tsx
  const enterEdit = (id: string) => { setEditingId(id); onEditingChange(true) }
  const exitEdit = () => { setEditingId(null); onEditingChange(false) }
  const idx = (date: string) => daysBetween(windowStart, date)
  const occupiedExcept = (id: string): Range[] =>
    cycles.filter((c) => c.id !== id).map((c) => ({ start: idx(c.startDate), end: idx(c.endDate) }))
  const commitDates = (id: string, start: number, end: number) =>
    onSetCycleDates(id, addDays(windowStart, start), addDays(windowStart, end))
```

Render: when `editingId` is set, render a transparent full-row backdrop `Pressable` (absolute, covers the row, `testID="edit-backdrop"`, `onPress={exitEdit}`) BEHIND the pills. For each cycle pill:
- `onLongPress={() => enterEdit(cycle.id)}` on the pill `Pressable` (keep `onPress={() => onCyclePress(cycle.id)}`). (Convert the pill from `TouchableOpacity` to `Pressable` if needed for `onLongPress`.)
- When `editingId === cycle.id`: apply a lifted style (scale 1.04 + bigger shadow), render a **Delete** button (`testID="delete-period"`, a trash/✕) that calls `onDeleteCycle(cycle.id)` then `exitEdit()`, and render **front** + **back** resize handles (~16px grab bars) at the pill ends.
- Attach three `PanResponder`s (created via `useRef`/`useMemo`, only granted when `editingId === cycle.id`):
  - **body move:** translate the pill by `gesture.dx` live; on release `const d = Math.round(g.dx / dayWidth); const r = clampMove(idx(cycle.startDate), idx(cycle.endDate), d, totalDays, occupiedExcept(cycle.id)); commitDates(cycle.id, r.start, r.end)`; reset the translate.
  - **front handle:** on release `const d = Math.round(g.dx / dayWidth); const ns = clampResizeStart(idx(cycle.startDate), idx(cycle.endDate), d, occupiedExcept(cycle.id)); commitDates(cycle.id, ns, idx(cycle.endDate))`.
  - **back handle:** on release `const d = Math.round(g.dx / dayWidth); const ne = clampResizeEnd(idx(cycle.startDate), idx(cycle.endDate), d, totalDays, occupiedExcept(cycle.id)); commitDates(cycle.id, idx(cycle.startDate), ne)`.
  (Live preview during drag — translateX for move, width/left adjust for resize — via `Animated.Value`s; this is the device-verified part. Keep the committed value authoritative on release.)

Keep the `create-period` `+` tiles and all existing testIDs unchanged. The pill keeps `testID="cycle-bar"`.

- [ ] **Step 4: Run — PASS.** `npx jest TimelineView`. Then `npx jest` (full) → green; `npx tsc --noEmit 2>&1 | grep TimelineView || echo clean`.

- [ ] **Step 5: Commit.**
```bash
git add src/components/TimelineView.tsx __tests__/TimelineView.test.tsx
git commit -m "feat: timeline edit mode — long-press to move/resize/delete a period"
```

- [ ] **Step 6: On-device verification** (gestures can't run in jest): long-press a period → it lifts + the calendar stops scrolling sideways; drag the body to move it (snaps to days, stops at neighbours/window); drag the front/back handles to resize (min 1 day, no overlap); tap Delete → confirm → it's gone; tap empty space → exits edit mode and scrolling resumes; a short tap still selects the basket.

---

## Self-Review

**Spec coverage:** long-press → edit mode + scroll-lock → Task 2 (lock) + Task 3 (enter); move/resize via helper → Task 1 + Task 3; front/back handles → Task 3; delete-by-id + confirm → Task 2 (handler) + Task 3 (button); tap-away backdrop → Task 3; `onSetCycleDates`/`onDeleteCycle(id)`/`onEditingChange` → Task 2; pure testable helper → Task 1; snap/min-1-day/no-overlap/window clamps → Task 1 (tested). Per-pill edit not changing active selection → Task 3 (enterEdit only sets `editingId`, never `activeCycleId`). ✓

**Placeholder scan:** Task 1 + 2 are exact code. Task 3's PanResponder live-preview is structural (RN gesture wiring is in-context judgment, device-verified) but the helper calls, the testIDs, and the long-press/Delete/`onCyclePress` paths are concrete + unit-tested. No TBDs.

**Type consistency:** `clampMove/clampResizeStart/clampResizeEnd` + `Range` signatures match between Task 1 (def) and Task 3 (use). `onSetCycleDates(id, startDate, endDate)` / `onDeleteCycle(id)` / `onEditingChange(editing)` identical across Task 2 (App + Props) and Task 3 (use). `idx`/`occupiedExcept`/`commitDates` use `daysBetween`/`addDays` (already imported in TimelineView).
