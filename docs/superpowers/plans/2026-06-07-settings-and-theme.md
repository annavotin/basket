# Settings Screen + App-Wide Theme System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the redesigned full-screen Settings screen and adopt the "matcha" design-token/theme system (light + dark + accent + fonts) across the whole app, with on-device preferences persisted. Account/auth UI is built against a stubbed service; the real Supabase backend is a separate plan.

**Architecture:** A `ThemeProvider` exposes the active palette via `useColors()`; the palette object keeps the *existing* color key names (recolored to the new tokens) plus the new token names, so migrating components is a mechanical `import { colors }` → `const colors = useColors()` swap. Preferences (name, defaultDays, units, theme, accent, macros) persist via the existing `storage.ts` per-key pattern under one `basket:prefs:v1` key. The Settings screen is rebuilt from the Claude Design source (`design/claude-design/basket-settings.{jsx,css}`) using RN primitives.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Jest + @testing-library/react-native. New deps: `expo-font`, `@expo-google-fonts/fredoka`, `@expo-google-fonts/nunito` (fonts); `expo-sharing` + `expo-file-system` (data export). No `react-native-svg` — use text glyphs (`›`, `‹`) for chevrons.

**Design source of truth:** `design/claude-design/` (in-repo). Exact colors → `basket.css` `:root` and `.se-dark`; Settings structure/logic → `basket-settings.jsx`; Settings styling (spacing, radii, sizes) → `basket-settings.css`; visual reference → `design/claude-design/screenshots/`.

---

## Token → key mapping (used throughout)

New palette keys (camelCase from `basket.css`): `sageBg #E7EEDD`, `sageBg2 #EDF2E6`, `sage100 #DCEACF`, `matchaSoft #C6E1B4`, `matcha #7CC96E`, `matcha600 #5FB152`, `matchaDeep #3E8F38`, `forest #2C3A1E`, `forestDeep #1E2914`, `moss #5A6B45`, `mossFaint #8A9A72`, `rose #EFA8C0`, `roseDeep #B45C7C`, `lime #CDEB6A`, `cream #FBFBF4`, `white #FFFFFF`, `line rgba(44,58,30,.08)`.

**Legacy-key bridge** (so existing components need no per-style rewrite). The active palette ALSO exposes the keys currently in `src/styles/colors.ts`, remapped:
`background→sageBg`, `surface→white`, `cycleBar→matcha`, `cycleBorder→matcha600`, `selectedDay→forest`, `selectedDayText→cream`, `dayText→forest`, `monthText→moss`, `extraPill→rose`, `extraPillText→roseDeep`, `itemCard→white` (use `sageBg2` where cards sit on white), `detailBackground→sage100`, `kcalText→forest`, `extraPillFaint→#F3D9E4`, `extraPillFaintText→roseDeep`, `pantry→#E6A23C`, `navTrack→moss`, `navSegmentActive→forest`.

Dark palette: from `.se-dark` in `basket-settings.css` (`sageBg #1C2417`, `sageBg2 #27311F`, `sage100 #2F3B25`, `white #283021`, `forest #EAF1E0`, `moss #A9BB92`, `mossFaint #7C8C68`, `line rgba(255,255,255,.09)`), legacy keys remapped the same way.

---

## Phase 1 — Theme foundation + fonts (app-wide adoption)

**Files:** Create `src/styles/palette.ts`, `src/styles/ThemeProvider.tsx`, `src/styles/fonts.ts`; modify `src/styles/colors.ts` (becomes a typed shape + re-export), `App.tsx`; migrate every component importing `colors`. Tests: `__tests__/ThemeProvider.test.tsx`.

- [ ] **Step 1 — failing test for the hook/provider.** `__tests__/ThemeProvider.test.tsx`:
  - renders a probe component inside `<ThemeProvider>` that reads `useColors().matcha` and asserts it equals `#7CC96E` in light;
  - with `initialTheme="dark"`, `useColors().sageBg` equals `#1C2417`;
  - `useColors()` exposes legacy keys (e.g. `colors.background` is truthy, `colors.selectedDay === colors.forest`);
  - setting accent to the amber triple makes `useColors().matcha` equal the accent base.
- [ ] **Step 2 — run it, confirm fail.** `npm test -- ThemeProvider`.
- [ ] **Step 3 — implement.**
  - `palette.ts`: export `Palette` type (all new keys + legacy keys), `lightPalette`, `darkPalette`, and `withAccent(palette, accent: [string,string,string])` that overrides `matcha/matcha600/matchaDeep/cycleBar/cycleBorder/selectedDay-adjacent` from the accent triple. Values per the mapping above.
  - `ThemeProvider.tsx`: context holding `{ theme, accent, colors }`. Resolve `'system'` via RN `useColorScheme()`. `colors = withAccent(theme==='dark'?dark:light, accent)`. Export `ThemeProvider` (props: `theme`, `accent`, optional `initialTheme` for tests), `useColors()`, `useThemeCtx()`.
  - `fonts.ts`: export font-family constants (`display: 'Fredoka_600SemiBold'`, `body: 'Nunito_700Bold'`, `bodyRegular: 'Nunito_400Regular'`, etc.) and the `fontMap` for `useFonts`.
  - `colors.ts`: keep a static `colors = lightPalette` export so any not-yet-migrated import still compiles (transitional).
- [ ] **Step 4 — wire App + fonts.** In `App.tsx`, load fonts with `useFonts(fontMap)` from `@expo-google-fonts/*`; render `null` until loaded. Wrap the app tree in `<ThemeProvider theme={prefs.theme} accent={prefs.accent}>` (prefs arrives in Phase 2; for now hardcode `theme="system"` and the matcha accent, replaced in Phase 2).
- [ ] **Step 5 — migrate components.** In each component currently doing `import { colors } from '../styles/colors'`, replace with `import { useColors } from '../styles/ThemeProvider'` and `const colors = useColors()` inside the component body (move `StyleSheet.create` that references colors into the body via `useMemo`, OR keep static structural styles and apply colors inline — prefer a `useMemo(() => StyleSheet.create({...}), [colors])`). Representative files: `BudgetBar`, `MealPrepDetail`, `PantryPeriodView`, `ExtrasPeriodList`, `ExtraMealDetail`, `SegmentedNav`, `AddFab`, `CalendarStrip`, `TimelineView`, `NewPeriodPanel`, `AddItemSheet`, `EditItemSheet`, `ReceiptReviewSheet`, `PantryScreen`, `ProfileScreen` (until replaced in Phase 3), plus `App.tsx`. Do them in small batches, running `npm test` after each batch.
- [ ] **Step 6 — install deps.** `npx expo install expo-font @expo-google-fonts/fredoka @expo-google-fonts/nunito`.
- [ ] **Step 7 — full suite green**, then commit per logical batch (`feat: theme provider`, `refactor: migrate <components> to useColors`).

**Note:** existing tests assert testIDs/text/widths, not color values, so the recolor shouldn't break them. If a test mounts a component that now calls `useColors()` outside a provider, wrap renders in `ThemeProvider` (add a small `renderWithTheme` test helper in `jest-setup.js` or per file).

## Phase 2 — Preferences model + persistence + App wiring

**Files:** `src/types.ts`, `src/data.ts`, `src/services/storage.ts`, `App.tsx`. Tests: `__tests__/storage.test.ts` (extend).

- [ ] Add `Preferences` type (`name`, `defaultDays`, `units:{weight:'g'|'oz',energy:'kcal'|'kJ'}`, `theme:'light'|'dark'|'system'`, `accent:[string,string,string]`, `macroTargets:{protein,carbs,fat}`) to `types.ts`; add `DEFAULT_PREFERENCES` to `data.ts` (defaults: name `''`, defaultDays `4`, units g/kcal, theme `system`, accent = matcha triple `['#7CC96E','#5FB152','#3E8F38']`, macros all `0`).
- [ ] TDD `loadPrefs`/`savePrefs` + `STORAGE_KEY_PREFS='basket:prefs:v1'` in `storage.ts`, mirroring `loadDailyGoal`. `loadPrefs` deep-merges stored values over `DEFAULT_PREFERENCES` (resilient to missing fields) and returns a full `Preferences` (or `DEFAULT_PREFERENCES` when nothing stored). Tests: round-trip, missing-field merge, corrupt JSON → defaults.
- [ ] Wire `App.tsx`: `const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES)`; hydrate in the existing mount effect (`loadPrefs().then(...)`); persist on change (`useEffect` guarded by `hydrated`). Feed `prefs.theme`/`prefs.accent` into `<ThemeProvider>` from Phase 1.
- [ ] Replace hardcoded `DEFAULT_DAYS = 4` usage: `handleCreatePeriod` uses `prefs.defaultDays`.
- [ ] Greeting: replace `"Welcome back!"` with `prefs.name ? \`Welcome back, ${prefs.name}!\` : 'Welcome back!'` (the design uses "Hi {name}" — match the design header text in `design/claude-design/basket-page.jsx`).
- [ ] Full suite green; commit.

## Phase 3 — Settings atoms + screen shell

**Files:** Create `src/components/settings/{SettingsSection,SettingsRow,Stepper,Segmented,Toggle,SwatchPicker,Chevron}.tsx` and `src/components/SettingsScreen.tsx`; modify `App.tsx` (header button + state rename). Replace `ProfileScreen`. Tests: `__tests__/settings/*.test.tsx`, `__tests__/SettingsScreen.test.tsx`; update/rename `ProfileScreen.test.tsx`.

- [ ] Build the atoms as RN equivalents of the `se-*` classes (styling values from `basket-settings.css`): `Stepper` (− value +, min/max/step/suffix), `Segmented` (options, value, onChange), `Toggle`, `SwatchPicker` (6 `ACCENTS` triples from `basket-settings.jsx`), `SettingsSection` (label + hint + card), `SettingsRow` (icon tile, label/sub, right slot: value/chevron/children, `danger`/`disabled`/`badge`). Each atom: a focused test (renders, fires onChange, respects min/max/disabled).
- [ ] `SettingsScreen.tsx`: full-screen `Modal presentationStyle="fullScreen"` + topbar (`‹` back glyph, "Settings" title) + `ScrollView`. Sections wired to `prefs` via props/callbacks: **Profile** (name inline input, avatar row placeholder), **Goals** (daily-goal Stepper in kcal/kJ per units, protein/carbs/fat Steppers), **Meal prep** (default period length Stepper), **Units** (weight + energy Segmented), **Appearance** (theme Segmented Light/Dark/Auto, accent SwatchPicker). Account/Data/About sections are added in Phases 5–6 (leave clearly marked placeholders or omit until those phases). Preserve a `daily-goal` test hook.
- [ ] Energy-unit display: daily goal shows `Math.round(goal*4.184)` when `units.energy==='kJ'` and converts back on change (logic from `basket-settings.jsx` lines 166–168, 238–240).
- [ ] App integration: rename header "⚙ Profile" → "⚙ Settings", `open-profile`→`open-settings`, `profileVisible`→`settingsVisible`; mount `<SettingsScreen>` with prefs + setters; delete `ProfileScreen.tsx`/`ProfileScreen.test.tsx` (or rename to Settings). Daily-goal still saved via existing `dailyGoal` state/handler.
- [ ] `SettingsScreen.test.tsx`: each section renders; editing name calls `onName`; stepping daily goal calls `onGoal`; switching theme Segmented calls `onTheme`; kJ mode converts the displayed goal. Update any App/header tests referencing `open-profile`.
- [ ] Full suite green; commit.

## Phase 4 — Units applied app-wide

**Files:** Create `src/utils/units.ts`; modify display components. Tests: `__tests__/units.test.ts`.

- [ ] TDD `formatWeight(grams, units)` (`oz = g/28.3495`, 1 dp) and `formatEnergy(kcal, units)` (`kJ = kcal*4.184`, rounded) returning display strings with unit suffix.
- [ ] Thread `units` (from prefs) to display components and replace raw `${weightG}g` / `${kcal}kcal` formatting: `BudgetBar`, `MealPrepDetail`, `PantryPeriodView`, `ExtrasPeriodList`, `AddItemSheet`, `ReceiptReviewSheet`. Prefer a tiny `UnitsContext` (provider in App) over deep prop-drilling, mirroring the theme provider pattern.
- [ ] Update affected component tests for the new formatted strings; full suite green; commit.

## Phase 5 — Data export / import / clear

**Files:** `src/services/storage.ts` (add `exportAll`, `clearAll`, optional `importAll`), `SettingsScreen.tsx` (Data section), `App.tsx`. Tests: `__tests__/storage.test.ts`.

- [ ] `exportAll(deps)`: read all `basket:*` keys, return a single JSON object; share via `expo-sharing`/`Share`. `clearAll(deps)`: remove all known `STORAGE_KEY*` keys (TDD with fake storage). `importAll(json, deps)`: validate + write keys (optional; can defer behind the row).
- [ ] Data section rows: Export (calls export+share), Import (document picker → `importAll`; optional), Clear all data (`Confirm` dialog → `clearAll` + reset in-memory state to `src/data.ts` seeds). Confirm dialog styling from `basket-settings.css` `.se-dialog`.
- [ ] `npx expo install expo-sharing expo-file-system` (+ `expo-document-picker` if implementing import).
- [ ] Tests for `clearAll`/`exportAll` shape; full suite green; commit.

## Phase 6 — Account / auth UI (stubbed) + About

**Files:** Create `src/services/auth.ts` (interface + local stub), `src/components/settings/AuthSheet.tsx`, `src/components/settings/ConfirmDialog.tsx`; modify `SettingsScreen.tsx`. Tests: auth-sheet + account-section tests.

- [ ] `auth.ts`: a typed `AuthService` interface (`signIn`, `signUp`, `signInWithApple`, `signInWithGoogle`, `signOut`, `resetPassword`, `deleteAccount`, `getAccount`, `onChange`) and a **local stub** implementation mirroring the design's mock (success unless email matches `/fail@/`, derives name from email). This is the seam the **separate Supabase backend plan** (`docs/superpowers/specs/2026-06-07-accounts-cloud-sync-backend-design.md`) will implement for real.
- [ ] Build `AuthSheet` (bottom sheet: Apple/Google buttons, email/password fields, validation, busy/error/sent states, signin/signup/forgot modes) and `ConfirmDialog` from `basket-settings.jsx`/`.css`.
- [ ] Settings Account section: signed-out CTA card (Sign in / Create account) and signed-in card (avatar, name/email, sync-status chip, Manage account, Sign out, Delete account→confirm). Account state lives in App via `auth.getAccount()`/`onChange`. About section: version (from `expo-constants`/`app.json`), feedback/rate/licenses/privacy/terms rows, and the disabled `Realtime sync — Soon` row.
- [ ] Tests: auth validation (invalid email/short password disables/erros), `fail@` shows error, success calls `onAuthed`; signed-in vs signed-out renders; delete/clear confirm flows. Full suite green; commit.

## Out of scope (separate plans)
- **Real Supabase auth + cloud sync backend** — `docs/superpowers/specs/2026-06-07-accounts-cloud-sync-backend-design.md` (Phase 6 only stubs the client seam).
- **Full per-food macro tracking** (Goals only sets targets).
- **Full "Fresh Matcha" relayout** of home/pantry/sheets (this plan recolors + adds Settings; it does not restructure existing screen layouts).

### Agreed next effort — "Fresh Matcha" redesign (separate plan, after this one)
Prioritised from the Claude Design prototype (`design/claude-design/`), to be planned and built as its own phased effort once Settings + theme lands:
1. **Full-screen Basket page** — progress ring, source breakdown + legend, stats (items / weight / kcal-per-day), item list with source tags + per-item share bars, scan-receipt CTA, kebab menu (prep-length slider + delete). Ref: `basket-page.jsx`.
2. **Pantry Defaults / "This prep"** — full-screen PantryPage with per-day defaults vs per-prep customisation + reset. Ref: `basket-pantry.jsx`.
3. **Search-based add sheet** — redesigned FAB flow with a searchable food catalog + quick-add + custom entry (food / extra / pantry modes). Ref: `AddSheet` in `basket-app.jsx`.
4. **Macro bars + home restyle** — macro mini-bars under the budget bar (NOTE: "consumed" is a kcal-derived 25/45/30 estimate, not real per-food macros) + the timeline/header visual restyle. Ref: `MacroBars` in `basket-page.jsx`.

## Verification
- **Tests:** `npm test` green after every phase. New suites: ThemeProvider, settings atoms, SettingsScreen, units, storage (prefs/clear/export), auth.
- **Manual (`npx expo start`):** open Settings from the header; change name → greeting updates; step daily goal/macros/default length → persist across relaunch; toggle Units → numbers reformat app-wide; switch Theme Light/Dark/Auto and Accent → palette changes everywhere live; Export shares JSON; Clear all → resets to seed; Auth sheet sign-in (stub) flips to signed-in state with sync chip. Compare against `design/claude-design/screenshots/`.
- Confirm fonts load (Fredoka headings, Nunito body) and dark mode matches `.se-dark`.
