# Unified scroll + page consolidation — Design

**Date:** 2026-06-22

## Goal
Make the home screen feel like **one page**. Today the header + calendar are pinned and only
the lower "basket sheet" scrolls ("pull up for full view"), there's a redundant full-screen
`BasketPage`, and the Extras/Pantry tabs look and behave differently from the Basket tab. After
this change: the whole page is a single vertical scroll, the redundant page is gone, all three
tabs render with the same row component, and pantry quantities are edited by tapping a row (not
a clunky inline field).

## Decisions (confirmed with user)
- **Scroll model:** header → calendar/timeline → budget bar → active list all scroll together as
  one. The **bottom Basket/Extras/Pantry nav and the + button stay pinned**; everything else
  (including the budget summary) scrolls away.
- **Remove the full basket page:** delete `BasketPage` *and* `BasketCharts`. Its two useful
  actions (change prep length, delete basket) move to a **⋮ menu** on the main page. Charts are
  dropped — the budget bar + macros already cover that.
- **Shared rows:** one row component for Basket, Extras, and Pantry lists.
- **Pantry edit:** tapping a pantry row opens `ItemDetail`, editing **this week's grams** *and*
  the **default daily grams**. Remove the inline grams field.

## Architecture

### 1. Single scroll container (`App.tsx`)
Replace the current structure (pinned `Animated.View` header + pinned calendar + a `detailArea`
whose basket branch has its own `ScrollView`) with:

```
<SafeAreaView>
  <View container>
    <ScrollView>                        ← the one vertical scroll
      Greeting header (Hi + 🥫 + ⚙️)     ← scrolls away
      CalendarStrip + TimelineView       ← horizontal ScrollView nested inside (unchanged)
      BudgetBar                          ← scrolls away
      <active list>                      ← basket items / extras / pantry (shared rows)
    </ScrollView>
    <SegmentedNav>   ← pinned (absolute, bottom)
    <AddFab>         ← pinned (absolute, bottom-right)
    …modals (AddItemSheet, ItemDetail, BasketOptionsSheet, etc.)
  </View>
</SafeAreaView>
```

- **Remove** the manual header-collapse machinery: `headerH`, `calH`, `collapseStyle`, the
  `onLayout` measurers, and the `Animated`/scroll-driven collapse. Natural scrolling replaces it.
- The three content states still render *inside* the single scroll: normal cycle (items list),
  empty cycle ("new shop" panel), and extra-day mode (`ExtraMealDetail`). Only their container
  changes from the old `detailArea`/`basketSheet` to plain children of the scroll.
- `SegmentedNav` (the Basket/Extras/Pantry switch) and `AddFab` move OUT of the scroll and are
  rendered as absolutely-positioned siblings pinned to the bottom, with the scroll given bottom
  `contentContainerStyle` padding so the last rows clear them.

### 2. Remove `BasketPage` + `BasketCharts`
- Delete `src/components/BasketPage.tsx` and `src/components/BasketCharts.tsx` and their tests.
- Remove all wiring in `App.tsx`: `basketPageOpen` state, the `<BasketPage>` element, the
  "Open basket ›" entry point, and the "This basket · pull up for full view" affordance.
- The list header for the Basket tab becomes a simple row: a title (e.g. "This basket") with a
  **⋮ button** on the right (`testID="basket-options-button"`).

### 3. `BasketOptionsSheet` (new) — the ⋮ menu
- New `src/components/BasketOptionsSheet.tsx`: a small bottom sheet (same Modal + scrim pattern
  as the other sheets) opened by the ⋮.
- Contents:
  - **Prep length** — the shared `settings/Stepper` (1–14 days, `testID="prep-days"`), wired to
    the existing day-change handler (`handleChangeDays`).
  - **Delete basket** — a destructive row that fires the existing delete flow (Alert-confirmed,
    `handleDeleteCycle`/equivalent).
- Props: `{ visible, dayCount, startDate, dailyGoal, onDaysChange, onDelete, onClose }`. No new
  business logic — it reuses the handlers `BasketPage` used.

### 4. Shared row component (`ItemRow`, new)
- Extract `src/components/ItemRow.tsx` from the existing `MealPrepDetail` white-card row:
  emoji avatar · name · `weight · kcal` subtitle · right-aligned `KCAL` value, tappable.
- Props: `{ emoji, name, subtitle, kcal, onPress, testID? }`.
- `MealPrepDetail`, `ExtrasPeriodList`, and `PantryPeriodView` all render `ItemRow` so the three
  tabs are visually identical. Each list supplies its own data + tap handler:
  - Basket row tap → `ItemDetail` (kind `item`) — existing.
  - Extras row tap → `ItemDetail` (kind `extra`) — existing (`onOpenExtra`).
  - Pantry row tap → `ItemDetail` (kind `pantry`) — see §5.

### 5. Pantry tap-to-edit (`PantryPeriodView` + `ItemDetail`)
- **`PantryPeriodView`:** remove the inline `pantry-grams` `TextInput` and the `onSetPantryGrams`
  prop. Each staple renders an `ItemRow` (subtitle shows this-week grams · kcal) that opens
  `ItemDetail` on tap via `onOpenPantry`.
- **`ItemDetail` (kind `pantry`):** edit two fields — **This week (g)** (the per-prep override)
  and **Default per day (g)** (the staple baseline). Saving routes to:
  - this-week grams → the existing per-cycle override handler (`handleSavePantryPatch` /
    `pantryOverrides`),
  - default daily grams → the existing default handler (`onSetDefaultGrams`).
  Macros are *not* edited here (per user). Name stays editable as it is today.
- The 🥫 PantryScreen (add/remove staples + Defaults/This-prep) is **unchanged** and remains the
  place to add or delete staples.

## Data flow
No new persistence or sync. All edits use existing handlers and state (`cycles`/`pantryOverrides`
for this-week grams, the pantry default for daily grams, `markDirty`/`touch` already applied in
those handlers). The redesign is structural (layout + component reuse), not a data change.

## Testing
- **App integration:** update tests that assert the old structure — the inner basket scroll, the
  "pull up for full view" text, and `BasketPage` ("Open basket"). Add: ⋮ opens `BasketOptionsSheet`;
  pinned nav/FAB still render while scrolled.
- **BasketOptionsSheet:** renders the prep stepper + delete; stepper calls `onDaysChange`; delete
  calls `onDelete`.
- **ItemRow:** renders name/subtitle/kcal and fires `onPress`.
- **PantryPeriodView:** no inline grams field; tapping a row calls `onOpenPantry`.
- **ItemDetail (pantry):** shows This-week + Default fields; saving calls both the per-cycle and
  the default handlers with the entered values.
- Delete the `BasketPage`/`BasketCharts` tests along with the components.

## Out of scope
- The 🥫 PantryScreen, extra-day mode, and the empty "new shop" screen keep working as-is inside
  the new single scroll (their internals are unchanged beyond the container swap).
- No new charts/visualisations (charts are removed, not relocated).
- No change to the scan/add flows, sync, or persistence.
