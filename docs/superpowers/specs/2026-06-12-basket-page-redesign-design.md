# Spec: Full-screen Basket page + typography swap

_2026-06-12_

**Goal:** Port the "Fresh Matcha" full-screen **Basket page** from the Claude Design handoff bundle into the native app, and swap the app's display/body fonts to the design's final typography (Merriweather headings + Inter body). This is the first of seven sub-projects decomposed from the design bundle (`/tmp/design-extract/basket/`); item-detail popups, carry-over modal, search-style add sheet, pantry redesign, per-food macros, and accent-setting removal are **separate, later efforts** and explicitly out of scope here.

**Design source of truth:** `basket/project/basket-page.{jsx,css}` (the `BasketPage`, `Ring`, `MacroBars`, `LengthSlider` components) and the chat intent in `basket/chats/chat2.md` (page introduced + iterated) and `chat3.md` (final font split). Recreate the **visual output**, not the prototype's internal DOM/CSS structure.

---

## Scope

In scope:
1. **Typography foundation** — load Merriweather + Inter, repoint the central font tokens, apply Merriweather to the home greeting and Basket-page headings.
2. **`react-native-svg`** — add the dependency (needed for the segmented ring); pod install + rebuild.
3. **`BasketPage.tsx`** — full-screen overlay with: 3-source segmented calorie ring, source bar + legend, macro mini-bars, stat tiles, item cards (source tag + per-day + share bar + kcal), scan-receipt CTA, sticky Add button, and a ⋮ menu sheet (prep-length slider 1–14 + delete basket).
4. **Open affordance** — an "Open basket ›" control on the basket panel header that opens the page; back chevron closes it.

Out of scope (later sub-projects): item-detail macro popup, carry-over modal, search add sheet, pantry full redesign, per-food macro data, accent-setting removal, per-screen serif-heading polish beyond the greeting + Basket page.

---

## Typography foundation

The design's final state (chat3): **serif for true headings, sans (Inter) for all functional UI** (numbers, names, buttons, nav). Both fonts are OFL-licensed (free for commercial use).

Changes to `src/styles/fonts.ts`:
- Load `Merriweather_700Bold` (from `@expo-google-fonts/merriweather`) and `Inter_400Regular`, `Inter_600SemiBold`, `Inter_700Bold`, `Inter_800ExtraBold` (from `@expo-google-fonts/inter`).
- New token `head: 'Merriweather_700Bold'` — true headings only.
- Repoint `display`/`displayMedium` → Inter SemiBold/Medium and `body*` → Inter weights. (Functional UI goes sans.)
- Update `fontMap` accordingly. Keep Fredoka/Nunito imports **removed** once nothing references them — verify with grep; if other screens still import specific Fredoka/Nunito family strings directly, they go through the `fonts` tokens, so repointing the tokens is sufficient and no per-screen edits are needed.
- Install with `npx expo install @expo-google-fonts/merriweather @expo-google-fonts/inter`.

Apply `fonts.head` (Merriweather) to: the home greeting ("Hi, {name}") and the Basket page's screen title, section label, and empty-state heading. Everything else uses the Inter-backed `display`/`body` tokens. Broader per-screen heading restyling is the separate typography sub-project.

**Risk:** Merriweather/Inter have different metrics than Fredoka/Nunito; existing screens may shift slightly. Verify the home screen and a couple of others still lay out cleanly after the swap (running app).

---

## BasketPage component

A full-screen overlay following the existing `SettingsScreen`/`PantryScreen` pattern: conditionally rendered from `App.tsx` behind a `basketPageOpen` boolean, absolutely positioned over the home tree, entering with a slide+fade. Props mirror the prototype:

```
<BasketPage
  cycle={activeCycle} pantry={pantry} extras={extras}
  dailyGoal={dailyGoal} macroTargets={prefs.macroTargets}
  onBack onAddItem onScanReceipt onSetDays onDeleteCycle onItemPress />
```

### Data (all via existing helpers — no new math)

| Value | Source |
|---|---|
| `days` | `daysBetween(start, end) + 1` |
| `mealPrepKcal` | `totalKcal(cycle.items)` |
| `pantryKcal` | `pantryKcalForCycle(pantry, cycle, days)` |
| `extrasKcal` | `extrasKcalInRange(extras, start, end)` |
| `budget` | `cycleBudget(days, dailyGoal)` |
| `consumed` | mealPrep + pantry + extras |
| item share % | `item.kcal / mealPrepKcal * 100` |
| total weight | `Σ item.weightG` |

### Sub-components (all inside `BasketPage.tsx`)

- **Ring** (`react-native-svg`): 148×148, track `sage-100`, one arc per source (`matcha` / `amber`(=`pantry` token) / `rose`), `strokeWidth` 13, arcs laid end-to-end starting at −90°, each arc length = `source/budget` of the circumference. Centre: consumed kcal (Inter, 34px) + "of {budget} kcal" label.
- **Source bar + legend**: 10px stacked bar (matcha/amber/rose widths = `source/budget`), legend row with coloured dot + label + bold total per source.
- **MacroBars**: three bars (Protein/Carbs/Fat). Consumed is **kcal-derived** — `p = consumed*0.25/4`, `c = consumed*0.45/4`, `f = consumed*0.30/9`; target = `macroTargets[k] * days`. Colours rose-deep / amber / matcha-deep. (Same estimate the prototype ships; real per-food macros are a later sub-project.)
- **Stat tiles**: items count · total weight (kg) · kcal/day.
- **Item cards**: emoji avatar, name (ellipsis), source tag (`Scanned`/`Receipt`/`Manual` from `item.source`, default Manual), `{weightG} g · {kcal/days}/day`, share bar, kcal. Whole card tappable → `onItemPress(item, index)` opens the existing `EditItemSheet`.
- **Empty state**: 🧺 + "Basket's empty" + scan prompt; the scan CTA gets emphasis when empty.
- **Scan-receipt CTA**: forest card, 🧾, "Scan a receipt / Add a whole shop in one tap", wired to the existing receipt-scan flow.
- **Sticky Add button**: forest pill, "+ Add to basket", wired to the existing add flow (opens `AddItemSheet`).
- **⋮ menu sheet**: scrim + bottom sheet titled "Meal Prep" with date range, the **LengthSlider** (range 1–14, updates `cycle.endDate` via `onSetDays` → reuse the existing change-days handler), and a destructive "🗑️ Delete this basket" (→ `onDeleteCycle`, reusing the existing empty-period/delete logic with the native `Alert.alert` confirm already used elsewhere).

### Item identity

Native `FoodItem` has **no `id`** (prototype keyed on `it.id`). Key item cards by **array index** and pass the index to `onItemPress`/`EditItemSheet` (which already edits by index). No data-model change needed for this page.

---

## Wiring in App.tsx

- Add `basketPageOpen` state (mirror `settingsOpen`).
- Render `<BasketPage … />` near the other full-screen overlays when `basketPageOpen && activeCycle`.
- `onBack` sets it false. `onSetDays`/`onDeleteCycle`/add/scan reuse the **existing** handlers (`handleChangeDays`, the period-delete logic, `setSheetVisible`, the receipt-scan trigger).
- **Open affordance**: an "Open basket ›" button in the basket-tab panel header (the `MealPrepDetail`/`SegmentedNav` basket view) that sets `basketPageOpen = true`. Only shown on the basket tab with an active cycle.

---

## Colour mapping (design var → native palette key)

`--sage-bg`→`sageBg`, `--sage-bg2`→`sageBg2`, `--sage-100`→`sage100`, `--matcha-soft`→`matchaSoft`, `--matcha`→`matcha`, `--matcha-600`→`matcha600`, `--matcha-deep`→`matchaDeep`, `--forest`→`forest`, `--moss`→`moss`, `--moss-faint`→`mossFaint`, `--rose`→`rose`, `--rose-deep`→`roseDeep`, `--amber`→`pantry`, `--white`→`white`, `--line`→`line`. All exist in `palette.ts` (light + dark), so the page is dark-mode-correct for free via `useColors()`.

---

## Testing

Follow the project's TDD convention; keep `expo-camera`/`scan.ts` out of the jest graph (mock).

- **nutrition/helpers**: existing helpers already covered — add tests only for any new pure helper (e.g. a `kcalDerivedMacros(consumed)` and `itemSharePct` if extracted).
- **BasketPage.test.tsx** (`@testing-library/react-native`): renders inside `ThemeProvider`; with a seeded cycle it shows the consumed/budget kcal, three source legend totals, N item cards with correct source tags, and the stat tiles; empty cycle shows the empty state + emphasised scan CTA; pressing an item calls `onItemPress` with the right index; the ⋮ button opens the menu sheet and the delete button calls `onDeleteCycle`.
- **Ring**: assert arc count and that arc dash lengths are proportional to each source (unit-test the arc-geometry helper rather than the SVG).
- Full suite green (`npm test`).

## Manual verification (running app)

Build to device/sim after `pod install` (react-native-svg is native). Confirm: open via "Open basket ›"; ring + three segments render; macro bars fill; stat tiles correct; item cards show tags/share bars; ⋮ opens sheet, slider changes the range + budget live, delete works; sticky Add and scan CTA open the right flows; back closes; dark mode looks right; Merriweather greeting + Inter UI render (fonts loaded).
