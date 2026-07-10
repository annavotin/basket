# Swipe-to-delete on list rows

Date: 2026-07-10

Add iOS-Mail-style swipe-left-to-delete to the three item lists: batch
(MealPrepDetail), extras (ExtrasPeriodList), pantry (PantryPeriodView).

## Interaction (decided)
Swipe a row left to reveal a red **Delete** button behind it; tapping Delete
removes the row. The deliberate reveal + tap is the confirmation, so **no
ConfirmDialog / modal**. Swiping back right, or tapping the row content while
open, closes it without deleting.

## Constraints
- **No new dependencies.** The project has no `react-native-gesture-handler` /
  `reanimated`; build with core `PanResponder` + `Animated`, matching the
  hand-rolled philosophy (AGENTS.md).
- The lists live inside the main vertical `ScrollView`, so the swipe must only
  claim the responder for horizontal-left gestures (e.g. in
  `onMoveShouldSetPanResponder`: `Math.abs(dx) > Math.abs(dy) && dx < -6`), or
  vertical scrolling breaks.
- Respect delete semantics (AGENTS.md): batch item = remove from the cycle's
  `items` array + `markDirty('cycles', activeCycleId)`; extra / pantry =
  soft-delete via `tombstone()` + `markDirty('extra_meals'|'pantry_items', id)`.
  All three already exist in `handleDetailRemove` ([App.tsx:794](../../../App.tsx)).

## Component: `src/components/SwipeRow.tsx`
- Props: `children: React.ReactNode`, `onDelete: () => void`, optional
  `deleteTestID?: string`.
- Animated `translateX`; a red Delete action (fixed width ~84) absolutely
  positioned behind the row on the right. Snap open past a threshold
  (~half the action width), else snap closed. Tapping Delete calls `onDelete`.
- While open, a tap on the row content closes it instead of passing through.
- Keep it self-contained; global "only one row open" coordination is optional
  and can be skipped for v1.

## Wiring
- `MealPrepDetail`: add `onDeleteItem?: (index: number) => void`; wrap each
  `food-item` row in `SwipeRow`. Only enable when the prop is provided (mirrors
  how `onEditItem` is gated to an active cycle). Delete button testID
  `delete-item`.
- `ExtrasPeriodList`: add `onDeleteExtra?: (id: string) => void`; wrap each
  `extra-item` row. Delete testID `delete-extra`.
- `PantryPeriodView`: add `onDeletePantry?: (id: string) => void`; wrap each
  `pantry-detail-row`. Delete testID `delete-pantry`.
- `App.tsx`: extract three functions from `handleDetailRemove` —
  `deleteItemAt(index)`, `deleteExtra(id)`, `deletePantry(id)` — and have
  `handleDetailRemove` call them (no behavior change). Pass them to the lists at
  every render site: MealPrepDetail ([App.tsx:1064](../../../App.tsx)),
  ExtrasPeriodList ([App.tsx:1035](../../../App.tsx) and
  [App.tsx:1069](../../../App.tsx)), PantryPeriodView
  ([App.tsx:1075](../../../App.tsx)). Gate `onDeleteItem` on an active cycle,
  matching `onEditItem`.

## Testing
- Gesture feel is device-only, but the wiring is testable: render each list with
  a delete handler, press the `delete-*` button, assert the handler fires with
  the right id/index. Keep `tsc` + `npm test` green.

## No em dashes in user-facing copy. (The only copy here is "Delete".)
