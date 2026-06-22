# Basket Prototype redesign — Design

**Date:** 2026-06-22

## Goal
Reskin the app to the "Basket Prototype" Claude Design: new typography (Hanken Grotesk +
Space Grotesk), a terracotta extras accent, a budget-as-one-card layout with macros inside, a
horizontal prep-selector row, and restyled calendar / item rows / sheets / settings / pantry /
new-shop. **Structure is largely unchanged** — this builds on the recent unified-scroll + tap-to-edit
work; it's a visual restyle plus a couple of re-laid-out elements, not a rebuild.

## Source of truth
The user's design export (`~/Downloads/Basket (1)/`). The implementable design is `Basket
Prototype.html` → `basket-app.css`, `basket-page.css`, `basket-settings.css` + the `*.jsx`
components (NOT `tweaks-panel.jsx` / `design-canvas.jsx`, which are design tooling). The
`screenshots/` PNGs are the visual targets (the fresh, user-confirmed ones — older variants with
"Open basket" pills / bordered cards / pink extras are superseded, ignore them).

**Vendor these into the repo first** (the established location, per the prior Fresh-Matcha pass):
copy the 3 CSS files, the app `*.jsx`, and the confirmed screenshots into `design/claude-design/`
(replacing the old design source) so implementation references them in-tree.

## Design tokens (the foundational change)

### Typography — replaces Merriweather + Inter
- **Hanken Grotesk** (weights 400/500/600/700/800) — all UI text, labels, headings (`--font-head`,
  `--font-display`, `--font-body` all map to it in the prototype).
- **Space Grotesk** (500/600/700) — numeric displays only (`--font-num`): the big kcal figures,
  calendar day numbers, stat-tile values, item-row kcal, macro gram values.
- Bundle the `.ttf`s under `assets/fonts/` and register in the existing `expo-font` `fontMap`;
  repoint the tokens in `src/styles/fonts.ts` (`fonts.head`/`display`/`body` → Hanken; add
  `fonts.num` → Space Grotesk). Both are OFL (free to bundle).

### Palette (light) — update `ThemeProvider` tokens
| Token | Hex | Notes |
|---|---|---|
| forest | `#2C3A1E` | unchanged — nav, FAB, today, headings |
| matcha / matcha-600 / matcha-deep | `#6E9249` / `#5C7A3C` / `#46612F` | meal-prep green |
| **rose / rose-deep** | **`#C56A4C` / `#A8512F`** | **extras accent — terracotta (was pink)** |
| amber | `#D9A441` | pantry |
| moss / moss-faint | `#6F7A60` / `#9AA189` | secondary / hint text |
| sage-bg / sage-bg2 / sage-100 | `#FFFFFF` / `#F1F5EB` / `#EAF0E2` | surfaces / tiles |
| cream / white / line | `#FBFCF9` / `#FFFFFF` / `rgba(28,36,21,.10)` | |

Map onto the current theme token names where they already exist; rename/add where the prototype
introduces new ones. The extras color change (pink→terracotta) ripples through CalendarStrip
markers, the BudgetBar "Extra" segment/legend, and the extras tab/rows.

## Per-screen restyle (match the confirmed screenshots)

- **Home / Basket** (`home-plan` / `basket-page` shots):
  - **Prep-selector row** (new layout): a horizontal row of pills between the calendar and the
    budget — the active prep as a filled green "Meal Prep" pill with a 3-emoji food cluster on the
    right, a dashed `＋` tile to add a prep, and selecting `＋` reveals a "New shop" pill whose body
    is the new-shop setup. This replaces the current `TimelineView` presentation (same data: cycles
    + create-period). Tapping a prep pill selects it; the calendar still drives day/extra selection.
  - **Budget = one white rounded card**: kcal headline (`4,770 / 10,000 kcal`, Space Grotesk) +
    `X left`, the stacked meal-prep/pantry/extra bar + legend, a hairline divider, then the
    PROTEIN/CARBS/FAT row with mini bars — all inside the single card. (Today `BudgetBar` renders
    these stacked; this nests them in a card and restyles.)
  - **Calendar**: day cards show weekday + number (Space Grotesk number), today = filled forest;
    marker circles above each day (terracotta filled = has extras, faint `＋` on empty days).
  - **Item rows**: flat rows with hairline dividers (no card border, no inline ✕) — rounded-square
    sage emoji tile, name (Hanken 500), `weight · kcal` subtitle (moss), right-aligned kcal value
    (Space Grotesk) over a tiny `KCAL` label. (Matches current `ItemRow`; restyle it.)
- **Extras tab**: same header/calendar/prep-row/budget; "Extra meals · N items"; rows with a
  fork-knife tile on a terracotta-tint background, date subtitle, terracotta kcal.
- **Pantry screen**: rounded back button + "Pantry / Staples in every meal prep"; Defaults/This-prep
  segmented toggle; info banner (recycle emoji); staple cards with `kcal/100g`, a `Per day` stepper
  (− g +) and `kcal/day`; bottom dark summary pill ("Adds to every day · N kcal").
- **Add sheet**: "Add to basket" + subtitle; dark "Scan barcode" + green "Scan receipt" buttons
  (keep the SVG icons just added); search field; suggestion cards with a green circular `＋`.
- **Settings**: rounded back button + "Settings"; dark **"Sign in to Basket"** card (radial
  highlight, Sign in / Create account); `PROFILE` section (Display name → value pill, Avatar → ›);
  `GOALS` section (Daily goal / Protein / Carbs / Fat steppers); footer note.
- **New-shop**: scan-receipt (dark) + scan-barcode (white) cards + a `Prep length` card (slider
  1–7–14, `N days`, date-range · budget footer).

## Explicit decisions
- **Item detail/edit sheet: keep the CURRENT `ItemDetail` layout** (it's preferred over the
  prototype's). Apply only the new fonts/colors. The prototype's item screenshots are a type/color
  reference, not a layout to copy.
- **Light mode only.** The prototype CSS ships dark tokens, but every confirmed screenshot is light
  and the app is `userInterfaceStyle: light`; dark mode is out of scope.
- **Preserve all recent UX + behaviour:** unified single scroll, pinned nav/FAB, tap-to-edit,
  no inline delete, pantry this-week+default editing, scan toggles, keep-scanning, rounding. This is
  paint, not plumbing — no business logic, persistence, or sync changes.

## Companion deliverable (separate, small)
**App icon → "cream on gradient"** from `Batch Logo.html`: extract that logo, render it to a
1024² `assets/icon.png`, and rebuild (same prebuild flow as before). Tracked as its own task in the
plan, independent of the restyle.

## Testing
The suite asserts behaviour + testIDs, not styling, so a faithful restyle should keep it green;
update only the rare test that asserts a literal style/old token. Add tests where a restyle changes
a testable contract (e.g. the new prep-selector's select/create handlers). Visual fidelity is
**device-verified** by the user against the screenshots — jest can't judge it.

## Out of scope
Dark mode; any structural/UX change beyond the prototype's visual layout; backend/sync/persistence;
the `tweaks-panel`/`design-canvas` tooling; re-introducing removed elements (Open-basket page,
inline ✕, drag-to-expand).
