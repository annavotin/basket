# Basket Prototype Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the app to the Basket Prototype design — Hanken Grotesk + Space Grotesk type, terracotta extras accent, near-white surfaces, a budget-as-one-card layout, a horizontal prep-selector row, and restyled calendar / rows / sheets / settings / pantry / new-shop — without changing behaviour.

**Architecture:** Foundation first (vendor the design source, swap fonts, repoint the palette tokens) — that alone shifts every screen's colors/type at once. Then per-screen tasks port the prototype CSS structure the tokens can't express (the budget card, prep-selector row, calendar markers, etc.), each verified against its screenshot. Light-only; no business-logic changes.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, `@expo-google-fonts/*`, Jest. Design source: `design/claude-design/` (vendored in Task 1) + `screenshots/`.

**Conventions:** `npx jest` (NEVER `npx expo start`). Commit to `main`. Restyle tasks preserve every testID + behaviour — the suite must stay green; only update a test that asserts a literal old token/style. Visual fidelity is **device-verified by the user** against the named screenshot (jest can't judge pixels).

---

## File Structure
- `design/claude-design/` — vendored prototype CSS/JSX + confirmed screenshots (source of truth).
- `src/styles/fonts.ts` — font tokens (+ new `num`).
- `src/styles/palette.ts`, `src/styles/ThemeProvider.tsx` — color tokens + accent default.
- Per-screen: `ItemRow`, `BudgetBar`, `CalendarStrip`, `TimelineView`→prep-selector, `AddItemSheet`, `ExtrasPeriodList`/`ExtraMealDetail`, `PantryScreen`/`PantryPeriodView`, `SettingsScreen`, `NewPeriodPanel`, `ItemDetail`.
- `assets/icon.png` — cream-on-gradient logo (Task 14).

---

## Task 1: Vendor the design source

**Files:** Create `design/claude-design/` (replacing old contents).

- [ ] **Step 1: Copy the confirmed export into the repo**

```bash
cd /Users/annavotin/personal/coding-proj/basket
rm -rf design/claude-design
mkdir -p design/claude-design
cp "/Users/annavotin/Downloads/Basket (1)/"basket-app.css "/Users/annavotin/Downloads/Basket (1)/"basket-page.css "/Users/annavotin/Downloads/Basket (1)/"basket-settings.css design/claude-design/
cp "/Users/annavotin/Downloads/Basket (1)/"basket-app.jsx "/Users/annavotin/Downloads/Basket (1)/"basket-page.jsx "/Users/annavotin/Downloads/Basket (1)/"basket-modals.jsx "/Users/annavotin/Downloads/Basket (1)/"basket-pantry.jsx "/Users/annavotin/Downloads/Basket (1)/"basket-settings.jsx "/Users/annavotin/Downloads/Basket (1)/"basket-helpers.jsx design/claude-design/
cp -R "/Users/annavotin/Downloads/Basket (1)/"screenshots design/claude-design/screenshots
cp "/Users/annavotin/Downloads/Basket (1)/Batch Logo.html" design/claude-design/
```

- [ ] **Step 2: Verify + commit**

Run: `ls design/claude-design` → expect the 3 css, the jsx, `screenshots/`, `Batch Logo.html`.
```bash
git add design/claude-design
git commit -m "chore: vendor Basket Prototype design source"
```

---

## Task 2: Swap fonts to Hanken Grotesk + Space Grotesk

**Files:** Modify `package.json` (deps), `src/styles/fonts.ts`. Test: `__tests__/fonts.test.ts` (create).

- [ ] **Step 1: Install the font packages**

```bash
npx expo install @expo-google-fonts/hanken-grotesk @expo-google-fonts/space-grotesk
```
(Confirm they resolve; both are real Expo Google Fonts packages.)

- [ ] **Step 2: Write the failing test**

Create `__tests__/fonts.test.ts`:
```ts
import { fonts, fontMap } from '../src/styles/fonts'

describe('fonts', () => {
  it('uses Hanken Grotesk for UI/headings and Space Grotesk for numbers', () => {
    expect(fonts.head).toBe('HankenGrotesk_700Bold')
    expect(fonts.display).toBe('HankenGrotesk_600SemiBold')
    expect(fonts.num).toBe('SpaceGrotesk_600SemiBold')
  })
  it('registers every referenced family in fontMap', () => {
    for (const family of Object.values(fonts)) {
      expect(Object.keys(fontMap)).toContain(family)
    }
  })
})
```

- [ ] **Step 3: Run it — FAIL** (`fonts.num` undefined / wrong families). `npx jest fonts`

- [ ] **Step 4: Rewrite `src/styles/fonts.ts`**

```ts
import {
  HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk'
import {
  SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'

export const fonts = {
  head: 'HankenGrotesk_700Bold',        // headings (greeting, screen/section titles)
  display: 'HankenGrotesk_600SemiBold', // functional UI: names, buttons, nav
  displayMedium: 'HankenGrotesk_500Medium',
  body: 'HankenGrotesk_700Bold',
  bodyRegular: 'HankenGrotesk_400Regular',
  bodySemi: 'HankenGrotesk_600SemiBold',
  bodyExtra: 'HankenGrotesk_800ExtraBold',
  num: 'SpaceGrotesk_600SemiBold',      // numeric displays (kcal, day numbers, stats)
  numBold: 'SpaceGrotesk_700Bold',
}

export const fontMap = {
  HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold,
  SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
}
```

- [ ] **Step 5: Run tests — PASS.** `npx jest fonts`. Then full suite `npx jest` — the token *names* changed but every component references `fonts.*` (not literals), so components are unaffected. Fix any test that asserted a literal `Merriweather_`/`Inter_` family.

- [ ] **Step 6: tsc + commit**

Run: `npx tsc --noEmit 2>&1 | grep -E "fonts.ts" || echo clean`
```bash
git add package.json package-lock.json src/styles/fonts.ts __tests__/fonts.test.ts
git commit -m "feat: swap to Hanken Grotesk + Space Grotesk (fonts.num)"
```

---

## Task 3: Repoint the palette to the prototype tokens

**Files:** Modify `src/styles/palette.ts`, `src/styles/ThemeProvider.tsx`. Test: `__tests__/palette.test.ts` (create).

Context: the prototype's light tokens (from `basket-app.css`): forest `#2C3A1E` (same), matcha `#6E9249` / 600 `#5C7A3C` / deep `#46612F`, **rose `#C56A4C` / rose-deep `#A8512F` (terracotta)**, amber `#D9A441`, moss `#6F7A60` / faint `#9AA189`, sage-bg `#FFFFFF` / bg2 `#F1F5EB` / 100 `#EAF0E2`, cream `#FBFCF9`, line `rgba(28,36,21,.10)`. The accent override in `ThemeProvider` currently forces the OLD greens back over `matcha*`, so its default must change too.

- [ ] **Step 1: Write the failing test**

Create `__tests__/palette.test.ts`:
```ts
import { lightPalette } from '../src/styles/palette'
import { DEFAULT_ACCENT_VALUE } from '../src/styles/ThemeProvider'

describe('palette — Basket Prototype tokens', () => {
  it('uses terracotta extras, olive matcha, near-white surfaces', () => {
    expect(lightPalette.rose).toBe('#C56A4C')
    expect(lightPalette.roseDeep).toBe('#A8512F')
    expect(lightPalette.matcha).toBe('#6E9249')
    expect(lightPalette.sageBg).toBe('#FFFFFF')
    expect(lightPalette.pantry).toBe('#D9A441')
    expect(lightPalette.forest).toBe('#2C3A1E')
  })
  it('default accent no longer overrides matcha back to the old greens', () => {
    expect(DEFAULT_ACCENT_VALUE).toEqual(['#6E9249', '#5C7A3C', '#46612F'])
  })
})
```

- [ ] **Step 2: Run it — FAIL.** `npx jest palette`

- [ ] **Step 3: Update `lightPalette` in `src/styles/palette.ts`** to:
```ts
  sageBg: '#FFFFFF', sageBg2: '#F1F5EB', sage100: '#EAF0E2',
  matchaSoft: '#D7E6C8', matcha: '#6E9249', matcha600: '#5C7A3C', matchaDeep: '#46612F',
  forest: '#2C3A1E', forestDeep: '#1E2914', moss: '#6F7A60', mossFaint: '#9AA189',
  rose: '#C56A4C', roseDeep: '#A8512F', lime: '#CDEB6A', cream: '#FBFCF9',
  white: '#FFFFFF', line: 'rgba(28,36,21,0.10)',
  // legacy keys, recolored to match:
  background: '#FFFFFF', surface: '#FFFFFF', cycleBar: '#6E9249', cycleBorder: '#5C7A3C',
  selectedDay: '#2C3A1E', selectedDayText: '#FBFCF9', dayText: '#2C3A1E', monthText: '#6F7A60',
  extraPill: '#C56A4C', extraPillText: '#A8512F', itemCard: '#FFFFFF', detailBackground: '#FFFFFF',
  kcalText: '#2C3A1E', extraPillFaint: '#F2DCD3', extraPillFaintText: '#A8512F',
  pantry: '#D9A441', navTrack: '#EDF2E6', navSegmentActive: '#2C3A1E',
```
(Keep `darkPalette` as-is — out of scope; it just won't be reached in light mode.)

- [ ] **Step 4: Update `DEFAULT_ACCENT_VALUE` in `src/styles/ThemeProvider.tsx`** to `['#6E9249', '#5C7A3C', '#46612F']`.

- [ ] **Step 5: Run tests — PASS** (`npx jest palette`), then full suite (`npx jest`). Fix any test asserting a literal old hex.

- [ ] **Step 6: tsc + commit**
```bash
git add src/styles/palette.ts src/styles/ThemeProvider.tsx __tests__/palette.test.ts
git commit -m "feat: repoint palette to Basket Prototype tokens (terracotta extras, olive matcha, white surfaces)"
```

---

## Restyle tasks (4–13) — shared shape

Each restyle task follows the same loop (no per-task duplication of these mechanics):
1. **Read the source:** the named `design/claude-design/*.css` classes + the named `screenshots/*.png`.
2. **Port to the RN component:** match layout, spacing, radii, weights, and the `fonts.num` numerals. Use palette tokens (never raw hex) so dark mode/future accents still work; add a token to `palette.ts` only if the prototype needs a color with no existing token.
3. **Preserve every testID + behaviour.** No prop/handler/logic changes unless the task says so.
4. **Verify:** `npx jest` stays green (fix only literal-style assertions); `npx tsc --noEmit 2>&1 | grep <file> || echo clean`; then commit. Mark the screenshot for the user's device pass.

---

## Task 4: Restyle `ItemRow`

**Files:** `src/components/ItemRow.tsx`. Source: `basket-page.css` `.row`/`.row .nm`/`.row .kc`/`.av`; screenshot `screenshots/basket-page.png`.

- [ ] Port: flat row, hairline `borderBottom` divider (`var(--line)`) instead of a bordered card; 44px rounded-square sage emoji tile; name in `fonts.display` (Hanken 500-ish, 15.5–16px, `forest`); `weight · kcal` subtitle in `moss`; right kcal value in **`fonts.num`** (`matchaDeep`, ~15px) over a 9px `KCAL` label (`mossFaint`).
- [ ] `npx jest ItemRow MealPrepDetail ExtrasPeriodList PantryPeriodView` green; tsc clean; commit `feat: restyle ItemRow to prototype (flat divider rows, Space Grotesk kcal)`. Device-verify against `basket-page.png`.

## Task 5: Restyle `BudgetBar` → one budget card

**Files:** `src/components/BudgetBar.tsx`. Source: `basket-page.css` `.budget`/`.bar`/`.bl`/macro classes; screenshot `screenshots/basket-page.png` (the white budget card).

- [ ] Wrap the whole thing in **one white rounded card** (`cream`/`white` bg, radius ~20, subtle border): kcal headline (`4,770 / 10,000 kcal`, big number in `fonts.num`) + `X left` (matchaDeep); the stacked meal-prep/pantry/extra bar + legend; a hairline divider; then the PROTEIN/CARBS/FAT row with mini bars (number values in `fonts.num`). Extras segment/legend use `rose`. Keep all props + the macro math.
- [ ] `npx jest BudgetBar` green; tsc clean; commit `feat: budget as one card with macros (prototype)`. Device-verify `basket-page.png`.

## Task 6: Restyle `CalendarStrip`

**Files:** `src/components/CalendarStrip.tsx`. Source: `basket-app.css` `.dcell`/`.dn`/marker classes; screenshots `01-home-plan.png`, `basket-page.png`.

- [ ] Day cards: weekday label (uppercase, mossFaint) + number in **`fonts.num`**; today = filled `forest` card with cream text; others = `sageBg2` cards. Marker circles above each day: terracotta (`rose`) filled when the day has extras, faint `extraPillFaint` `＋` on empty days. Keep `onExtraPress`/`activeExtraDate` behaviour + testIDs.
- [ ] `npx jest CalendarStrip` green; tsc clean; commit `feat: restyle CalendarStrip (number font, terracotta markers)`. Device-verify.

## Task 7: Prep-selector row (replaces TimelineView presentation)

**Files:** `src/components/TimelineView.tsx` (or a new `PrepSelector.tsx` swapped in App.tsx where `TimelineView` renders). Source: `basket-app.jsx` prep-row + `basket-app.css` prep-pill/`.cnew`/dashed-tile classes; screenshots `basket-page.png` (Meal Prep pill) + the new-shop shot (the green "New shop" pill).

- [ ] Render the cycles as a horizontal row of pills: active cycle = filled green "Meal Prep" pill with a 3-emoji food cluster on the right; a dashed `＋` tile to create a prep; the in-creation/empty cycle shows as a "New shop" pill. Wire to the SAME data + handlers `TimelineView` uses today (`cycles`, `activeCycleId`, `onCyclePress`, `onCreatePeriod`) — this is presentation only. Preserve the `app-timeline`/cycle testIDs (re-map if renamed; update `TimelineView.test` accordingly).
- [ ] **Write/adjust a test** asserting a cycle pill press calls `onCyclePress(id)` and the `＋` tile calls `onCreatePeriod`. `npx jest TimelineView App` green; tsc clean; commit `feat: horizontal prep-selector row (replaces timeline)`. Device-verify against both shots.

## Task 8: Restyle `AddItemSheet`

**Files:** `src/components/AddItemSheet.tsx`. Source: `basket-modals.jsx` add-sheet + `basket.css`/`basket-app.css` `.sheet`/`.srch`/`.qopt` classes; screenshot `02-sheets.png` / the Add-to-basket shot.

- [ ] Restyle only: "Add to basket" heading (`fonts.head`), subtitle; the two scan buttons (keep the SVG icons; dark `forest` barcode + `matcha` receipt); search field; suggestion cards with a green circular `＋`. Keep the Edit/Remember/Keep-scanning toggles + every testID + handler.
- [ ] `npx jest AddItemSheet` green; tsc clean; commit `feat: restyle AddItemSheet (prototype)`. Device-verify.

## Task 9: Restyle `ExtrasPeriodList` + `ExtraMealDetail`

**Files:** `src/components/ExtrasPeriodList.tsx`, `src/components/ExtraMealDetail.tsx`. Source: `basket-page.css` extras classes; the Extras-tab screenshot.

- [ ] "Extra meals · N items" header; rows via `ItemRow`-style with a fork-knife tile on `extraPillFaint`, date subtitle, kcal in `fonts.num` colored `roseDeep` (terracotta). Keep `onOpenExtra`/remove behaviour + testIDs.
- [ ] `npx jest ExtrasPeriodList ExtraMealDetail` green; tsc clean; commit `feat: restyle extras (terracotta)`. Device-verify.

## Task 10: Restyle `PantryScreen` + `PantryPeriodView`

**Files:** `src/components/PantryScreen.tsx`, `src/components/PantryPeriodView.tsx`. Source: `basket-pantry.jsx` + `basket-page.css` `.pp-*`/`.pstep-*` classes; the Pantry screenshot.

- [ ] Rounded back button + "Pantry / Staples in every meal prep"; Defaults/This-prep segmented toggle; info banner (recycle emoji, `sage100` bg); staple cards with `kcal/100g`, a `Per day` stepper (− g +) and `kcal/day` (`fonts.num`); bottom dark `forest` summary pill ("Adds to every day · N kcal"). Keep all stepper/toggle testIDs + handlers.
- [ ] `npx jest PantryScreen PantryPeriodView` green; tsc clean; commit `feat: restyle pantry (prototype)`. Device-verify.

## Task 11: Restyle `SettingsScreen`

**Files:** `src/components/SettingsScreen.tsx` (+ `settings/SettingsRow.tsx` if shared). Source: `basket-settings.jsx`/`basket-settings.css` `.se-*` classes; the Settings screenshot.

- [ ] Rounded back button + "Settings"; dark `forest` **"Sign in to Basket"** card (radial highlight, Sign in / Create account); `PROFILE` section (Display name → value pill, Avatar → ›); `GOALS` section (Daily goal/Protein/Carbs/Fat steppers, `fonts.num` values); footer note. Keep auth wiring + all testIDs.
- [ ] `npx jest SettingsScreen` green; tsc clean; commit `feat: restyle settings (prototype)`. Device-verify.

## Task 12: Restyle `NewPeriodPanel` (new-shop)

**Files:** `src/components/NewPeriodPanel.tsx`. Source: `basket-page.css` `.bp-scan*`/`.bp-len*` classes; the new-shop screenshot.

- [ ] Scan-receipt (dark `forest`) + scan-barcode (white) cards (keep the SVG icons); `Prep length` card with slider (1–7–14), `N days` (`fonts.num`), and `date → date · budget` footer. Keep `onScanBarcode`/`onScanReceipt`/`onDaysChange` + testIDs.
- [ ] `npx jest NewPeriodPanel` green; tsc clean; commit `feat: restyle new-shop panel (prototype)`. Device-verify.

## Task 13: Restyle `ItemDetail` (fonts/colors only — keep layout)

**Files:** `src/components/ItemDetail.tsx`. Source: the item-detail screenshots as a **type/color reference only**.

- [ ] Apply the new fonts (headings `fonts.head`, numbers `fonts.num`) + palette (terracotta protein bar accent, amber carbs, matcha fat per the macro bars) to the EXISTING layout. Do NOT change structure, fields, or the edit flow. Keep every `id-*` testID.
- [ ] `npx jest ItemDetail` green; tsc clean; commit `feat: restyle ItemDetail type/colors (layout unchanged)`. Device-verify.

---

## Task 14: App icon → "cream on gradient"

**Files:** `assets/icon.png`. Source: `design/claude-design/Batch Logo.html`.

- [ ] **Step 1:** Open `design/claude-design/Batch Logo.html`, locate the logo labelled **"cream on gradient"**, and isolate that one tile's markup (it'll be an SVG/HTML block on a gradient background).
- [ ] **Step 2:** Render it to a 1024×1024 PNG. Preferred: a small headless render (e.g. `npx playwright` screenshot of that node) — or, if the logo is a standalone SVG, convert via `rsvg-convert`/`sharp` at 1024². If neither tool is available, STOP and report so the user can export it from the design tool.
- [ ] **Step 3:** Save as `assets/icon.png` (overwriting). Confirm `file assets/icon.png` → `1024 x 1024`.
- [ ] **Step 4: Commit** `feat: cream-on-gradient app icon`. Note for the user: this only shows after `npx expo prebuild -p ios` + a rebuild (the splash already points at `assets/icon.png`, so it updates too).

---

## Self-Review

**Spec coverage:**
- Vendor design source → Task 1 ✓
- Fonts (Hanken + Space Grotesk, `fonts.num`) → Task 2 ✓
- Palette (terracotta extras, olive matcha, white surfaces, accent default) → Task 3 ✓
- Prep-selector row → Task 7 ✓; budget-as-card+macros → Task 5 ✓; calendar markers → Task 6 ✓; flat item rows → Task 4 ✓
- Add / Extras / Pantry / Settings / New-shop restyle → Tasks 8/9/10/11/12 ✓
- ItemDetail keep-layout-restyle-only → Task 13 ✓
- App icon (cream-on-gradient) → Task 14 ✓
- Light-only, behaviour preserved → stated in every restyle task's shared shape ✓

**Placeholder scan:** Tasks 1–3 + 14 are concrete (exact commands/code). Tasks 4–13 are restyle tasks deliberately source-referenced (RN file + exact prototype CSS classes + exact target screenshot + the key values to port) — pixel-exact RN transcription of 10 components belongs in the doing, not the plan, and the design source + screenshots are vendored in Task 1 so each subagent has them.

**Type/name consistency:** `fonts.num` is defined in Task 2 and consumed in Tasks 4/5/6/10/11/12/13. Palette token names are unchanged (Task 3 only changes their hex values), so every component keeps compiling. `DEFAULT_ACCENT_VALUE` updated in Task 3 matches `withAccent`'s use. Prep-selector (Task 7) reuses `TimelineView`'s existing props (`cycles`/`activeCycleId`/`onCyclePress`/`onCreatePeriod`).
