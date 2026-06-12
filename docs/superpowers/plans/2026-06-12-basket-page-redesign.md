# Full-screen Basket page + typography swap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Fresh Matcha full-screen Basket page (3-source calorie ring, macro bars, stat tiles, item cards, scan CTA, sticky add, prep-length/delete menu) and swap the app's fonts to Merriweather headings + Inter body.

**Architecture:** `BasketPage.tsx` is a full-screen `Modal` overlay following the existing `SettingsScreen`/`PantryScreen` pattern, opened from an "Open basket ›" affordance on the basket tab and rendered from `App.tsx` behind a `basketPageOpen` flag. All data comes from existing `nutrition.ts` helpers plus three new pure helpers. All add/scan/edit/delete interactions reuse existing `App.tsx` handlers. The calorie ring uses `react-native-svg`.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, react-native-svg, @expo-google-fonts/{merriweather,inter}, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-12-basket-page-redesign-design.md`

---

### Task 1: Add dependencies

**Files:**
- Modify: `package.json` (via expo install)
- Modify: `ios/` Pods (via pod install)

- [ ] **Step 1: Install JS deps**

Run:
```bash
npx expo install react-native-svg @expo-google-fonts/merriweather @expo-google-fonts/inter
```
Expected: package.json gains `react-native-svg`, `@expo-google-fonts/merriweather`, `@expo-google-fonts/inter`.

- [ ] **Step 2: Reinstall pods (react-native-svg is native)**

Run:
```bash
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install && cd ..
```
Expected: `RNSVG` appears in the pod output. (If it errors with an ASCII-8BIT encoding error, the LANG prefix above is required — it's already included.)

- [ ] **Step 3: Typecheck still clean for our code**

Run: `npx tsc --noEmit 2>&1 | grep -v "SettingsScreen.test\|storage.test" | head`
Expected: no new errors (the two pre-existing test-file errors are unrelated and filtered out).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json ios/Podfile.lock
git commit -m "chore: add react-native-svg + Merriweather/Inter fonts"
```

---

### Task 2: Typography swap

**Files:**
- Modify: `src/styles/fonts.ts`
- Modify: `App.tsx` (import `fonts`, greeting text + style)
- Test: `__tests__/ThemeProvider.test.tsx` (already passing; just must stay green)

- [ ] **Step 1: Rewrite `src/styles/fonts.ts`**

Replace the whole file with:
```ts
import { Merriweather_700Bold } from '@expo-google-fonts/merriweather'
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter'

export const fonts = {
  head: 'Merriweather_700Bold',   // true headings only (greeting, screen/section titles)
  display: 'Inter_600SemiBold',   // functional UI: numbers, names, buttons, nav
  displayMedium: 'Inter_500Medium',
  body: 'Inter_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyExtra: 'Inter_800ExtraBold',
}

export const fontMap = {
  Merriweather_700Bold,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
}
```

- [ ] **Step 2: Point the greeting at Merriweather and update its text**

In `App.tsx`, ensure the fonts import includes `fonts` (it currently imports `fontMap`). Find the import line for `./src/styles/fonts` and make it:
```ts
import { fonts, fontMap } from './src/styles/fonts'
```

Change the greeting line (currently `App.tsx:399`):
```tsx
<Text style={styles.greeting}>{prefs.name ? `Welcome back, ${prefs.name}!` : 'Welcome back!'}</Text>
```
to:
```tsx
<Text style={styles.greeting}>{prefs.name ? `Hi, ${prefs.name}` : 'Hi there'}</Text>
```

In the `greeting` style (around `App.tsx:73`), add `fontFamily: fonts.head,` to the style object (keep its other properties).

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all suites pass (272+). The font swap is token-level, so layout-coupled tests stay green.

- [ ] **Step 4: Commit**

```bash
git add src/styles/fonts.ts App.tsx
git commit -m "feat: swap to Merriweather headings + Inter body, greeting 'Hi, {name}'"
```

---

### Task 3: Pure helpers for the Basket page

**Files:**
- Modify: `src/utils/nutrition.ts`
- Test: `__tests__/nutrition.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `__tests__/nutrition.test.ts`:
```ts
import { kcalDerivedMacros, ringArcs, itemSharePct } from '../src/utils/nutrition'

describe('kcalDerivedMacros', () => {
  it('splits kcal into P/C/F grams (25/45/30, 4/4/9 kcal-per-g)', () => {
    expect(kcalDerivedMacros(2000)).toEqual({ protein: 125, carbs: 225, fat: 67 })
  })
  it('is zero at zero kcal', () => {
    expect(kcalDerivedMacros(0)).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })
})

describe('ringArcs', () => {
  it('returns fraction-of-budget and cumulative offset per value', () => {
    const arcs = ringArcs([2500, 2500, 0], 10000)
    expect(arcs[0]).toEqual({ fraction: 0.25, offset: 0 })
    expect(arcs[1]).toEqual({ fraction: 0.25, offset: 0.25 })
    expect(arcs[2]).toEqual({ fraction: 0, offset: 0.5 })
  })
  it('clamps a single value to the full ring and handles zero budget', () => {
    expect(ringArcs([99999], 1000)[0].fraction).toBe(1)
    expect(ringArcs([100], 0)[0]).toEqual({ fraction: 0, offset: 0 })
  })
})

describe('itemSharePct', () => {
  it('is the item kcal as a percent of the total', () => {
    expect(itemSharePct(250, 1000)).toBe(25)
  })
  it('is 0 when the total is 0', () => {
    expect(itemSharePct(250, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run, confirm fail**

Run: `npm test -- nutrition`
Expected: FAIL — `kcalDerivedMacros`/`ringArcs`/`itemSharePct` are not exported.

- [ ] **Step 3: Implement the helpers**

Append to `src/utils/nutrition.ts`:
```ts
/** Estimate consumed macros from total kcal: 25% protein, 45% carbs, 30% fat
 *  (protein/carbs 4 kcal/g, fat 9 kcal/g). Same estimate the design prototype ships. */
export function kcalDerivedMacros(consumedKcal: number): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((consumedKcal * 0.25) / 4),
    carbs: Math.round((consumedKcal * 0.45) / 4),
    fat: Math.round((consumedKcal * 0.30) / 9),
  }
}

/** For a segmented progress ring: each value's fraction of the budget plus the
 *  cumulative offset (also as a fraction of budget) of all preceding values. */
export function ringArcs(values: number[], budget: number): { fraction: number; offset: number }[] {
  let acc = 0
  return values.map((v) => {
    const fraction = budget > 0 ? Math.max(0, Math.min(1, v / budget)) : 0
    const offset = budget > 0 ? acc / budget : 0
    acc += v
    return { fraction, offset }
  })
}

/** An item's kcal as a percentage of the basket total. */
export function itemSharePct(itemKcal: number, totalKcal: number): number {
  return totalKcal > 0 ? (itemKcal / totalKcal) * 100 : 0
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `npm test -- nutrition`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/nutrition.ts __tests__/nutrition.test.ts
git commit -m "feat: ring-arc + kcal-derived-macro + item-share helpers"
```

---

### Task 4: BasketPage component

**Files:**
- Create: `src/components/BasketPage.tsx`
- Test: `__tests__/BasketPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/BasketPage.test.tsx`:
```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import BasketPage from '../src/components/BasketPage'
import { MealPrepCycle, PantryItem, ExtraMeal, MacroTargets } from '../src/types'

jest.mock('react-native-svg', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Stub = (p: any) => React.createElement(View, p, p.children)
  return { __esModule: true, default: Stub, Svg: Stub, Circle: Stub }
})

const cycle: MealPrepCycle = {
  id: 'c1', startDate: '2026-06-03', endDate: '2026-06-07',
  items: [
    { name: 'Salmon', weightG: 300, kcal: 600, emoji: '🐟', source: 'barcode' },
    { name: 'Oats', weightG: 500, kcal: 400, emoji: '🌾', source: 'manual' },
  ],
}
const pantry: PantryItem[] = []
const extras: ExtraMeal[] = []
const macros: MacroTargets = { protein: 140, carbs: 220, fat: 70 }

function renderPage(overrides: Partial<React.ComponentProps<typeof BasketPage>> = {}) {
  const props = {
    visible: true, cycle, pantry, extras, dailyGoal: 2000, macroTargets: macros,
    onBack: jest.fn(), onAddItem: jest.fn(), onScanReceipt: jest.fn(),
    onSetDays: jest.fn(), onDeleteCycle: jest.fn(), onItemPress: jest.fn(),
    ...overrides,
  }
  const utils = render(
    <ThemeProvider theme="light" accent={['#7CC96E', '#5FB152', '#3E8F38']}>
      <BasketPage {...props} />
    </ThemeProvider>
  )
  return { ...utils, props }
}

describe('BasketPage', () => {
  it('shows consumed kcal and the budget', () => {
    const { getByText } = renderPage()
    expect(getByText('1,000')).toBeTruthy()        // 600 + 400 meal-prep
    expect(getByText('of 10,000 kcal')).toBeTruthy() // 5 days * 2000
  })

  it('lists each item with its source tag', () => {
    const { getByText } = renderPage()
    expect(getByText('Salmon')).toBeTruthy()
    expect(getByText('Scanned')).toBeTruthy()
    expect(getByText('Oats')).toBeTruthy()
    expect(getByText('Manual')).toBeTruthy()
  })

  it('shows the item count stat tile', () => {
    const { getByText } = renderPage()
    expect(getByText('items')).toBeTruthy()
  })

  it('calls onItemPress with the index when a card is tapped', () => {
    const { getByText, props } = renderPage()
    fireEvent.press(getByText('Salmon'))
    expect(props.onItemPress).toHaveBeenCalledWith(0)
  })

  it('shows the empty state when the basket has no items', () => {
    const { getByText } = renderPage({ cycle: { ...cycle, items: [] } })
    expect(getByText("Basket's empty")).toBeTruthy()
  })

  it('opens the menu and deletes', () => {
    const { getByLabelText, getByText, props } = renderPage()
    fireEvent.press(getByLabelText('More'))
    fireEvent.press(getByText('Delete this basket'))
    expect(props.onDeleteCycle).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run, confirm fail**

Run: `npm test -- BasketPage`
Expected: FAIL — `Cannot find module '../src/components/BasketPage'`.

- [ ] **Step 3: Implement `src/components/BasketPage.tsx`**

```tsx
import React, { useMemo, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { MealPrepCycle, PantryItem, ExtraMeal, MacroTargets } from '../types'
import {
  totalKcal, cycleBudget, pantryKcalForCycle, extrasKcalInRange,
  kcalDerivedMacros, ringArcs, itemSharePct,
} from '../utils/nutrition'
import { daysBetween, formatDay } from '../utils/dates'

const SRC_LABEL: Record<string, string> = { barcode: 'Scanned', receipt: 'Receipt', manual: 'Manual' }
const R = 60
const CIRC = 2 * Math.PI * R

type Props = {
  visible: boolean
  cycle: MealPrepCycle
  pantry: PantryItem[]
  extras: ExtraMeal[]
  dailyGoal: number
  macroTargets: MacroTargets
  onBack: () => void
  onAddItem: () => void
  onScanReceipt: () => void
  onSetDays: (days: number) => void
  onDeleteCycle: () => void
  onItemPress: (index: number) => void
}

export default function BasketPage({
  visible, cycle, pantry, extras, dailyGoal, macroTargets,
  onBack, onAddItem, onScanReceipt, onSetDays, onDeleteCycle, onItemPress,
}: Props) {
  const colors = useColors()
  const [menu, setMenu] = useState(false)

  const days = daysBetween(cycle.startDate, cycle.endDate) + 1
  const mealPrep = totalKcal(cycle.items)
  const pan = pantryKcalForCycle(pantry, cycle, days)
  const ext = extrasKcalInRange(extras, cycle.startDate, cycle.endDate)
  const consumed = mealPrep + pan + ext
  const budget = cycleBudget(days, dailyGoal)
  const weight = cycle.items.reduce((s, i) => s + (i.weightG || 0), 0)
  const a = formatDay(cycle.startDate)
  const b = formatDay(cycle.endDate)
  const rangeLabel = `${a.day} ${a.month} – ${b.day} ${b.month} · ${days} days`

  const arcs = ringArcs([mealPrep, pan, ext], budget)
  const arcColors = [colors.matcha, colors.pantry, colors.rose]
  const pct = (v: number) => (budget > 0 ? Math.max(0, Math.min(100, (v / budget) * 100)) : 0)
  const macro = kcalDerivedMacros(consumed)
  const macroDefs = [
    { label: 'Protein', got: macro.protein, target: macroTargets.protein * days, color: colors.roseDeep, track: 'rgba(180,92,124,.18)' },
    { label: 'Carbs', got: macro.carbs, target: macroTargets.carbs * days, color: colors.pantry, track: 'rgba(230,162,60,.20)' },
    { label: 'Fat', got: macro.fat, target: macroTargets.fat * days, color: colors.matchaDeep, track: 'rgba(124,201,110,.22)' },
  ]

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.sageBg },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
    backTxt: { fontSize: 22, color: colors.forest, lineHeight: 24 },
    ttl: { flex: 1, minWidth: 0 },
    ttlK: { fontFamily: fonts.head, fontSize: 19, color: colors.forest },
    ttlS: { fontFamily: fonts.body, fontSize: 12, color: colors.moss, marginTop: 2 },
    menuBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    menuDots: { fontSize: 22, color: colors.moss, lineHeight: 22 },
    scroll: { paddingHorizontal: 16, paddingBottom: 120 },
    hero: { borderRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, backgroundColor: colors.sageBg2, alignItems: 'center' },
    ring: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center' },
    ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    ringK: { fontFamily: fonts.display, fontSize: 34, color: colors.forest },
    ringL: { fontFamily: fonts.bodyExtra, fontSize: 11, color: colors.mossFaint, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
    fill: { width: '100%', marginTop: 18 },
    srcbar: { flexDirection: 'row', height: 10, borderRadius: 6, backgroundColor: colors.sage100, overflow: 'hidden', gap: 2 },
    srcleg: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
    legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legDot: { width: 8, height: 8, borderRadius: 3 },
    legTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.mossFaint },
    legVal: { fontFamily: fonts.display, fontSize: 13, color: colors.forest },
    macros: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 13, borderTopWidth: 1.5, borderTopColor: colors.line },
    macro: { flex: 1 },
    macroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    macroL: { fontFamily: fonts.bodyExtra, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.3, color: colors.moss },
    macroV: { fontFamily: fonts.display, fontSize: 12, color: colors.forest },
    macroBar: { height: 6, borderRadius: 4, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 4 },
    stats: { flexDirection: 'row', gap: 9, marginTop: 12 },
    stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 13, alignItems: 'center' },
    statV: { fontFamily: fonts.display, fontSize: 21, color: colors.forest },
    statL: { fontFamily: fonts.body, fontSize: 11, color: colors.mossFaint, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
    seclbl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, paddingTop: 20, paddingBottom: 11 },
    seclblK: { fontFamily: fonts.head, fontSize: 16, color: colors.forest },
    seccnt: { fontFamily: fonts.body, fontSize: 12, color: colors.mossFaint },
    items: { gap: 10 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 },
    av: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center' },
    avTxt: { fontSize: 25 },
    itMid: { flex: 1, minWidth: 0 },
    itNm: { fontFamily: fonts.display, fontSize: 16, color: colors.forest },
    itMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    tag: { backgroundColor: colors.sage100, color: colors.moss, fontFamily: fonts.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, overflow: 'hidden' },
    metaTxt: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: colors.mossFaint },
    itBar: { height: 5, borderRadius: 4, backgroundColor: colors.sageBg2, overflow: 'hidden', marginTop: 8 },
    itBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.matchaSoft },
    itKc: { width: 50, alignItems: 'flex-end' },
    itKcV: { fontFamily: fonts.display, fontSize: 15, color: colors.matchaDeep },
    itKcL: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint },
    empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 30 },
    emptyE: { fontSize: 46, marginBottom: 12 },
    emptyH: { fontFamily: fonts.head, fontSize: 18, color: colors.forest, marginBottom: 5 },
    emptyP: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss, textAlign: 'center', lineHeight: 20 },
    scan: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14, backgroundColor: colors.forest, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
    scanIc: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
    scanIcTxt: { fontSize: 21 },
    scanTx: { flex: 1 },
    scanB: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
    scanS: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.matchaSoft, marginTop: 1 },
    scanGo: { fontSize: 24, color: 'rgba(255,255,255,.6)' },
    cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 26, backgroundColor: colors.sageBg },
    addBtn: { borderRadius: 18, paddingVertical: 16, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addTxt: { fontFamily: fonts.display, fontSize: 16, color: '#fff' },
    scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,36,23,.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 14 },
    sheetH: { fontFamily: fonts.head, fontSize: 20, color: colors.forest },
    sheetDesc: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mossFaint, marginTop: 2, marginBottom: 14 },
    lenTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    lenL: { fontFamily: fonts.display, fontSize: 14, color: colors.forest },
    lenV: { fontFamily: fonts.display, fontSize: 24, color: colors.matchaDeep },
    lenRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
    lenStep: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.sageBg2, alignItems: 'center' },
    lenStepTxt: { fontFamily: fonts.display, fontSize: 18, color: colors.forest },
    lenFoot: { fontFamily: fonts.body, fontSize: 12, color: colors.moss, textAlign: 'center', marginTop: 10, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: colors.line },
    del: { marginTop: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(180,92,124,.12)', alignItems: 'center' },
    delTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.roseDeep },
  }), [colors])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} transparent={false}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.top}>
          <TouchableOpacity style={styles.back} onPress={onBack} accessibilityLabel="Back">
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={styles.ttl}>
            <Text style={styles.ttlK}>Meal Prep</Text>
            <Text style={styles.ttlS} numberOfLines={1}>{rangeLabel}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenu(true)} accessibilityLabel="More">
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.ring}>
              <Svg width={148} height={148} viewBox="0 0 148 148">
                <Circle cx={74} cy={74} r={R} stroke={colors.sage100} strokeWidth={13} fill="none" />
                {arcs.map((arc, i) => arc.fraction > 0 ? (
                  <Circle key={i} cx={74} cy={74} r={R} stroke={arcColors[i]} strokeWidth={13} fill="none"
                    strokeDasharray={`${arc.fraction * CIRC} ${CIRC}`}
                    rotation={-90 + arc.offset * 360} originX={74} originY={74} />
                ) : null)}
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.ringK}>{consumed.toLocaleString()}</Text>
                <Text style={styles.ringL}>of {budget.toLocaleString()} kcal</Text>
              </View>
            </View>

            <View style={styles.fill}>
              <View style={styles.srcbar}>
                <View style={{ width: `${pct(mealPrep)}%`, backgroundColor: colors.matcha }} />
                <View style={{ width: `${pct(pan)}%`, backgroundColor: colors.pantry }} />
                <View style={{ width: `${pct(ext)}%`, backgroundColor: colors.rose }} />
              </View>
              <View style={styles.srcleg}>
                {[['Meal prep', colors.matcha, mealPrep], ['Pantry', colors.pantry, pan], ['Extras', colors.rose, ext]].map(([label, c, v]) => (
                  <View style={styles.legItem} key={label as string}>
                    <View style={[styles.legDot, { backgroundColor: c as string }]} />
                    <Text style={styles.legTxt}>{label} <Text style={styles.legVal}>{(v as number).toLocaleString()}</Text></Text>
                  </View>
                ))}
              </View>
              <View style={styles.macros}>
                {macroDefs.map((m) => {
                  const p = Math.max(0, Math.min(100, (m.got / Math.max(1, m.target)) * 100))
                  return (
                    <View style={styles.macro} key={m.label}>
                      <View style={styles.macroTop}>
                        <Text style={styles.macroL}>{m.label}</Text>
                        <Text style={styles.macroV}>{m.got}<Text style={{ color: colors.mossFaint }}>/{Math.round(m.target)}g</Text></Text>
                      </View>
                      <View style={[styles.macroBar, { backgroundColor: m.track }]}>
                        <View style={[styles.macroFill, { width: `${p}%`, backgroundColor: m.color }]} />
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {cycle.items.length > 0 ? (
            <>
              <View style={styles.stats}>
                <View style={styles.stat}><Text style={styles.statV}>{cycle.items.length}</Text><Text style={styles.statL}>items</Text></View>
                <View style={styles.stat}><Text style={styles.statV}>{(weight / 1000).toFixed(weight >= 1000 ? 1 : 2)}kg</Text><Text style={styles.statL}>total weight</Text></View>
                <View style={styles.stat}><Text style={styles.statV}>{days ? Math.round(mealPrep / days).toLocaleString() : 0}</Text><Text style={styles.statL}>kcal / day</Text></View>
              </View>

              <View style={styles.seclbl}>
                <Text style={styles.seclblK}>Receipt</Text>
                <Text style={styles.seccnt}>{cycle.items.length} item{cycle.items.length === 1 ? '' : 's'}</Text>
              </View>

              <View style={styles.items}>
                {cycle.items.map((it, idx) => (
                  <TouchableOpacity style={styles.item} key={idx} onPress={() => onItemPress(idx)} activeOpacity={0.7}>
                    <View style={styles.av}><Text style={styles.avTxt}>{it.emoji}</Text></View>
                    <View style={styles.itMid}>
                      <Text style={styles.itNm} numberOfLines={1}>{it.name}</Text>
                      <View style={styles.itMeta}>
                        <Text style={styles.tag}>{SRC_LABEL[it.source || 'manual']}</Text>
                        <Text style={styles.metaTxt}>{it.weightG} g · {days ? Math.round(it.kcal / days) : it.kcal}/day</Text>
                      </View>
                      <View style={styles.itBar}><View style={[styles.itBarFill, { width: `${itemSharePct(it.kcal, mealPrep)}%` }]} /></View>
                    </View>
                    <View style={styles.itKc}><Text style={styles.itKcV}>{it.kcal.toLocaleString()}</Text><Text style={styles.itKcL}>KCAL</Text></View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyE}>🧺</Text>
              <Text style={styles.emptyH}>Basket's empty</Text>
              <Text style={styles.emptyP}>Scan your receipt to add a whole shop at once — or add items one by one.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.scan} onPress={onScanReceipt} activeOpacity={0.85}>
            <View style={styles.scanIc}><Text style={styles.scanIcTxt}>🧾</Text></View>
            <View style={styles.scanTx}><Text style={styles.scanB}>Scan a receipt</Text><Text style={styles.scanS}>Add a whole shop in one tap</Text></View>
            <Text style={styles.scanGo}>›</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.cta}>
          <TouchableOpacity style={styles.addBtn} onPress={onAddItem} activeOpacity={0.9}>
            <Text style={styles.addTxt}>＋ Add to basket</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
          <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setMenu(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
              <View style={styles.grab} />
              <Text style={styles.sheetH}>Meal Prep</Text>
              <Text style={styles.sheetDesc}>{rangeLabel}</Text>
              <View style={styles.lenTop}>
                <Text style={styles.lenL}>Prep length</Text>
                <Text style={styles.lenV}>{days} <Text style={{ fontSize: 13, color: colors.mossFaint }}>day{days === 1 ? '' : 's'}</Text></Text>
              </View>
              <View style={styles.lenRow}>
                <TouchableOpacity style={styles.lenStep} onPress={() => onSetDays(Math.max(1, days - 1))}><Text style={styles.lenStepTxt}>−</Text></TouchableOpacity>
                <TouchableOpacity style={styles.lenStep} onPress={() => onSetDays(Math.min(14, days + 1))}><Text style={styles.lenStepTxt}>＋</Text></TouchableOpacity>
              </View>
              <Text style={styles.lenFoot}>{a.day} {a.month} → {b.day} {b.month} · {(days * dailyGoal).toLocaleString()} kcal budget</Text>
              <TouchableOpacity style={styles.del} onPress={() => { setMenu(false); onDeleteCycle() }}>
                <Text style={styles.delTxt}>🗑️  Delete this basket</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  )
}
```

> **Design note:** the prototype's ⋮ menu uses a draggable range slider for prep length. RN has no native `<input type=range>`; this uses −/＋ steppers (1–14 clamp) which produce the same `onSetDays` result. Faithful to behaviour, not to the slider widget.

- [ ] **Step 4: Run, confirm pass**

Run: `npm test -- BasketPage`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/BasketPage.tsx __tests__/BasketPage.test.tsx
git commit -m "feat: full-screen BasketPage component (ring, stats, items, menu)"
```

---

### Task 5: Wire BasketPage into App

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add state and the delete handler**

In `App.tsx`, after the `editIndex` state (around line 126) add:
```tsx
  const [basketPageOpen, setBasketPageOpen] = useState(false)
```

Add an import for `Alert` to the existing `react-native` import block if not present, then add this handler near the other cycle handlers (e.g. after `handleChangeDays`):
```tsx
  function handleDeleteCycle() {
    Alert.alert('Delete this basket?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setCycles((prev) => prev.filter((c) => c.id !== activeCycleId))
          setActiveCycleId(null)
          setBasketPageOpen(false)
        },
      },
    ])
  }
```

- [ ] **Step 2: Add the "Open basket ›" affordance**

In the basket-tab block (around `App.tsx:460`, the `weeklyTab === 'basket'` branch), wrap the `MealPrepDetail` so an Open button sits above it:
```tsx
                {weeklyTab === 'basket' && (
                  <>
                    <TouchableOpacity
                      testID="open-basket-page"
                      onPress={() => setBasketPageOpen(true)}
                      style={{ alignSelf: 'flex-end', backgroundColor: colors.forest, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 6, marginBottom: 8 }}
                    >
                      <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>Open basket ›</Text>
                    </TouchableOpacity>
                    <MealPrepDetail
                      activeCycle={activeCycle}
                      onRemoveItem={handleRemoveItem}
                      onEditItem={handleEditItem}
                    />
                  </>
                )}
```
(The inner-component code is unchanged — only the wrapping `<>…</>` and the button are added. `colors` from `useColors()` is already in scope in this component; confirm it is, and if not add `const colors = useColors()` near the top of the render function.)

- [ ] **Step 3: Render the overlay**

Next to the other full-screen overlays (after `<PantryScreen … />`, around `App.tsx:538`), add:
```tsx
        {activeCycle && (
          <BasketPage
            visible={basketPageOpen}
            cycle={activeCycle}
            pantry={pantry}
            extras={extraMeals}
            dailyGoal={dailyGoal}
            macroTargets={prefs.macroTargets}
            onBack={() => setBasketPageOpen(false)}
            onAddItem={() => { setBasketPageOpen(false); handleAddManual() }}
            onScanReceipt={() => { setBasketPageOpen(false); handleScanReceipt() }}
            onSetDays={handleChangeDays}
            onDeleteCycle={handleDeleteCycle}
            onItemPress={(index) => { setBasketPageOpen(false); handleEditItem(index) }}
          />
        )}
```

Add the import at the top with the other component imports:
```tsx
import BasketPage from './src/components/BasketPage'
```

- [ ] **Step 4: Typecheck + full suite**

Run: `npx tsc --noEmit 2>&1 | grep -v "SettingsScreen.test\|storage.test" | head`
Expected: no new errors.

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: open BasketPage from basket tab + wire delete/add/scan/edit"
```

---

### Task 6: Manual verification on device

**Files:** none (verification only)

- [ ] **Step 1: Build to the phone in Release (standalone, no Metro)**

Run:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/basket-*
npx expo run:ios --device "00008030-000D3094013A802E" --configuration Release
```
Expected: `Build Succeeded`, app installs. (Device id is Anna's iPhone; re-list with `xcrun xctrace list devices` if it changed.)

- [ ] **Step 2: Verify the flow**

On the phone, confirm:
- Header greeting reads "Hi, {name}" in a serif (Merriweather); the rest of the UI is Inter.
- On the basket tab with items, "Open basket ›" pushes into the full page.
- The ring renders with up to three coloured segments; the source bar + legend totals match; macro bars fill.
- Stat tiles show items / weight / kcal-day.
- Item cards show source tags + share bars; tapping one opens the edit sheet.
- ⋯ opens the sheet; −/＋ changes the range + budget live; delete asks to confirm then removes the basket and closes the page.
- Sticky "Add to basket" opens the add sheet; "Scan a receipt" opens the receipt flow.
- Back chevron closes the page.
- Toggle Settings → Dark mode and reopen the page — colours adapt.

- [ ] **Step 3: Update the memory note**

Append to `/Users/annavotin/.claude/projects/-Users-annavotin-personal-coding-proj-basket/memory/basket-mvp-state.md` a short line recording that the Fresh Matcha redesign sub-project #1 (Basket page + Merriweather/Inter fonts + react-native-svg) shipped, and that 6 sub-projects remain (item detail, carry-over, search add sheet, pantry redesign, per-food macros, accent removal).

---

## Self-Review notes

- **Spec coverage:** typography swap (Task 2), react-native-svg (Task 1), ring/source-bar/macro/stats/items/scan/sticky-add/⋮-menu (Task 4), open affordance + App wiring + reused handlers (Task 5), colour mapping (Task 4 styles use `colors.*`), tests (Tasks 3–4), manual verification (Task 6). All spec sections covered.
- **Item identity:** keyed by array index throughout; `onItemPress(index)` → `handleEditItem(index)`. Consistent.
- **Out of scope confirmed absent:** no item-detail macro popup, no carry-over modal, no search sheet, no pantry redesign, no per-food macros, no accent removal.
- **Known deviation:** prep-length uses −/＋ steppers instead of a drag slider (RN has no native range input) — same `onSetDays` behaviour. Flagged inline in Task 4.
