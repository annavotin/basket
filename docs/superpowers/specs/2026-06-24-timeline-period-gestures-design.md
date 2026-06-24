# Timeline period gestures — long-press to move / resize / delete — Design

**Date:** 2026-06-24

## Goal
Let the user directly manipulate a meal-prep period on the timeline: **long-press** a period
pill to "pick it up" into an edit mode, then **drag the body** to move it (keeping its length),
**drag the front/back handles** to change its start/end, or tap **Delete**. The pills live inside
the calendar's horizontal scroll, so a plain drag would be stolen by the scroll — long-press as
the entry point disambiguates and unifies all three actions.

## Current state
`src/components/TimelineView.tsx` renders each cycle as a `TouchableOpacity` pill positioned by
date span (`left = startIdx*dayWidth + 4`, `width = spanDays*dayWidth - 8`), inside App's
horizontal calendar `ScrollView`. Props: `cycles`, `windowStart`, `totalDays`, `dayWidth`,
`activeCycleId`, `onCyclePress`, `onCreatePeriod`. App has `handleCyclePress`,
`handleCreatePeriod`, `handleChangeDays` (sets the active cycle's `endDate`), and
`handleDeleteCycle` (deletes the **active** cycle, with a confirm Alert + leftover carry-over).
There is no "move period" / "change start" handler yet, and delete is active-only.

## Interaction model (TimelineView)
- **Enter edit mode:** long-press a pill (`Pressable` `onLongPress`, ~350 ms). The pill lifts
  (scale ~1.04 + stronger shadow). Edit mode is *per-pill* and does **not** change the
  active/selected cycle (the basket view below stays put). A short tap still fires `onCyclePress`.
- **Lock the scroll:** TimelineView reports edit state up via a new `onEditingChange(editing)`
  prop; App sets the calendar `ScrollView`'s `scrollEnabled={!editing}` so drags aren't stolen.
- **Edit affordances on the lifted pill:**
  - **Move** — a `PanResponder` on the pill body. `dx → dayDelta = round(dx / dayWidth)`. Live
    preview via `translateX`; on release, commit the snapped new `[start,end]` (length kept).
  - **Resize front** — a grab handle (~16 px) at the left end with its own `PanResponder` →
    changes `startDate` only.
  - **Resize back** — a grab handle at the right end → changes `endDate` only.
  - **Delete** — a small trash button on/above the pill → the existing delete flow (confirm +
    carry-over), targeted at this pill's id.
- **Exit edit mode:** a transparent full-row backdrop `Pressable` rendered behind the lifted pill
  catches taps outside it → exits (and unlocks scroll). Committing a drag keeps edit mode until
  tap-away.

## Constraints (enforced on every move/resize, clamped — never rejected silently)
- **Whole-day snapping** (to the `dayWidth` grid).
- **Minimum 1 day** (a resize can't make start > end).
- **No overlap** with any other period (a day belongs to one prep).
- **Stay within the window** (`0 … totalDays-1`).

## Components / data flow
1. **`src/utils/timelineDrag.ts` (new, pure, unit-tested)** — operates on 0-based day indices
   from `windowStart`:
   - `clampMove(start, end, dayDelta, totalDays, occupied): { start, end }` — shift both by
     `dayDelta`, clamp into the window, and clamp so the span doesn't cross any `occupied`
     `[s,e]` range (the nearest non-overlapping position in the drag direction).
   - `clampResizeStart(start, end, dayDelta, occupied): newStart` — `start+dayDelta`, clamped to
     `[lowerBound … end]` (≥0, ≥ the nearest occupied range below, ≤ end).
   - `clampResizeEnd(start, end, dayDelta, totalDays, occupied): newEnd` — symmetric for the end.
   `occupied` = the other cycles' index ranges. TimelineView builds it from `cycles` (excluding
   the dragged one), converts the result back to dates via `addDays(windowStart, idx)`, and calls
   the handler below.
2. **App handlers:**
   - **`onSetCycleDates(id, startDate, endDate)`** (new) — `setCycles(prev => prev.map(c => c.id===id ? touch({ ...c, startDate, endDate }) : c)); markDirty('cycles', id)`. Used for both move and resize.
   - **Generalize delete to `onDeleteCycle(id)`** — refactor `handleDeleteCycle` to take a cycle
     id (keep the confirm Alert + the leftover carry-over it already does); long-press-delete
     passes the pill's id. The existing ⋮ "Delete basket" passes the active id.
3. **TimelineView props added:** `onSetCycleDates(id, startDate, endDate)`, `onDeleteCycle(id)`,
   `onEditingChange(editing: boolean)`. Existing props/testIDs (`cycle-bar`, `create-period`)
   preserved; tap and the `+` tiles unchanged.

## Edge cases
- Dragging a 1-day period: front/back resize respect min-1-day. Move clamps at window ends.
- A period boxed in by neighbors on both sides: move is a no-op (clamped); resize stops at the
  neighbor. No error.
- Empty "New shop" periods are editable/deletable like any other.
- Deleting the period currently shown in the basket: handled by the existing delete flow
  (it already deselects/cleans up).

## Testing
- **Unit (jest):** `timelineDrag` clamp functions — snapping, min-1-day, window bounds, and
  overlap clamping (neighbor on left, on right, both). The `onSetCycleDates` reducer behaviour.
- **Device-verified:** the long-press lift, drag-to-move, edge-resize, scroll-lock, tap-away,
  and delete — gestures can't be exercised in jest.

## Out of scope
- Cross-row / vertical dragging, multi-select, undo, haptics (could add `expo-haptics` later).
- Reordering items within a basket (separate concern).
