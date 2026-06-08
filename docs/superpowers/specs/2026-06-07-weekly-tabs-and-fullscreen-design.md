# Weekly view tabs, period-scoped pantry, and full-screen Profile/Pantry

Date: 2026-06-07

## Summary

Two independent workstreams:

1. **Weekly view segmented navigation + 3-color budget bar.** Replace the implicit,
   calendar-driven view switching in the lower two-thirds of the home screen with an
   explicit segmented nav (Basket / Extras / Pantry) that toggles what the period
   detail box shows. Split pantry calories out of the meal-prep total so the budget
   bar shows three colored segments.
2. **Full-screen Profile and global Pantry editor.** Convert both from bottom-sheet
   modals to full-screen presentations with room to grow.

## Motivation

- The Pantry/Profile bottom sheets are cramped; the user wants full pages that can
  hold more content over time.
- Within a selected meal-prep period there can be many items across three categories
  (basket items, extra meals, pantry staples). A segmented nav lets the user toggle
  between them without long scrolling.
- The budget bar currently folds pantry calories silently into the meal-prep (green)
  segment. Pantry should be a visually distinct contribution.

## Terminology

- **Main Pantry (global editor):** opened from the top-right corner. Where the user
  defines their default weekly staples (name, kcal/100g, grams/day). Global, not
  period-scoped. Becomes a full screen.
- **Pantry tab (weekly view):** one of the three segmented-nav tabs. Shows the global
  staples' calorie contribution scaled across the selected period's X days. Does NOT
  add/remove staples.

## Workstream 1 — Weekly view

### §1 State & selection flow (`App.tsx`)

- New state: `weeklyTab: 'basket' | 'extras' | 'pantry'`, default `'basket'`.
- Selecting a meal-prep period on the timeline opens the lower detail box and resets
  `weeklyTab` to `'basket'`.
- Calendar extra-pill reconciliation:
  - Tapping an extra pill on a day **inside** the selected (or containing) period
    selects that period and switches the lower box to the **Extras** tab.
  - Days with extras that fall **outside** any meal-prep period keep the existing
    standalone behavior (`ExtraMealDetail` via `activeExtraDate`). Nothing breaks for
    extras that aren't inside a period.
- Adding an extra from the Extras tab: date defaults to **today** if today is within
  the period's range, otherwise the period's **first day**. Editable afterward.

### §2 `SegmentedNav` component + bottom bar

- New `SegmentedNav.tsx`: dark rounded pill with three segments (Basket · Extras ·
  Pantry); the active segment is filled darker (per the user's screenshot).
  - Props: `active: WeeklyTab`, `onChange: (tab: WeeklyTab) => void`.
  - TestIDs: `tab-basket`, `tab-extras`, `tab-pantry`.
- Bottom bar row: `SegmentedNav` (left, flexes) + `AddFab` (right circle).
  - The `+` (AddFab) renders **only** when the active tab is Basket or Extras. Hidden
    on Pantry.
  - The bottom bar / nav only appears when a meal-prep period is selected.

### §3 Lower detail area — three tab bodies

- **Basket** → existing `MealPrepDetail`, refactored to **remove its embedded pantry
  section**. It now renders only the meal-prep items with their kcal/gram sliders.
- **Extras** → new `ExtrasPeriodList.tsx`: extras filtered to the period's
  `[startDate, endDate]`, reusing `ExtraMealDetail`'s row UI. Supports remove; add is
  driven by the FAB (date defaulting per §1).
- **Pantry** → new `PantryPeriodView.tsx`: lists each global staple with its grams and
  **kcal contribution scaled across the period's X days**. No add/remove (managed in
  the full-screen editor). **Keeps the existing per-period gram slider**
  (`pantryOverrides` via `onSetPantryGrams`), since that is period-scoped tuning.

### §4 3-color budget bar (`BudgetBar.tsx`)

- Split the previously combined meal-prep value:
  - `mealPrepKcal` = `totalKcal(items)` only
  - `pantryKcal` = `pantryKcalForCycle(...)` (new, broken out)
  - `extraKcal` = extras in range (unchanged)
- `BudgetBar` gains a `pantryKcal` prop and renders three stacked segments:
  meal-prep (green), pantry (new color), extras (pink).
- Add a `pantry` color to `src/styles/colors.ts`.
- Update `App.tsx` budget math (the `barMealPrep` / `barExtra` block) so pantry is
  passed separately rather than added into `barMealPrep`.

## Workstream 2 — Full-screen Profile & Pantry editor

### §5 Presentation conversion

- Convert `ProfileScreen.tsx` and the global `PantryScreen.tsx` from bottom-sheet
  `Modal`s (`animationType="slide"`, backdrop, anchored sheet) to **full-screen**
  presentations: a top bar (title + close/back control) and a scrollable body sized to
  the full screen, with room to add more settings later.
- No business-logic changes. The Pantry editor keeps its add-staple form and
  add/remove list; Profile keeps the daily-goal control.
- Preserve existing testIDs: `open-pantry`, `open-profile`, `pantry-row`,
  `pantry-remove`, `pantry-name-input`, `pantry-kcal-input`, `pantry-grams-input`,
  `pantry-add`, `pantry-close`, and Profile's equivalents.

## §6 Testing

- Tab switching renders the correct body (basket items / extras list / pantry view).
- FAB hidden when Pantry tab active; visible on Basket and Extras.
- Extras tab shows only extras whose date is within the period range.
- New extra defaults to today (or first day when today is out of range).
- Budget bar renders three segments with widths proportional to meal-prep / pantry /
  extras.
- Full-screen Profile and Pantry editor still expose existing testIDs and the
  add/remove flows still work.

## Files touched

- `App.tsx` — tab state, selection flow, budget math, render branching.
- `src/components/BudgetBar.tsx` — third segment + `pantryKcal` prop.
- `src/components/MealPrepDetail.tsx` — remove embedded pantry section.
- `src/components/ProfileScreen.tsx` — full-screen presentation.
- `src/components/PantryScreen.tsx` — full-screen presentation.
- `src/styles/colors.ts` — pantry color.
- `src/components/SegmentedNav.tsx` — new.
- `src/components/ExtrasPeriodList.tsx` — new.
- `src/components/PantryPeriodView.tsx` — new.

## Out of scope / deferred

- Persistence and editable-quantity work already tracked separately remains deferred.
- Additional Profile content beyond the existing daily-goal control (the full-screen
  layout just makes room for it).
