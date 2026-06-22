# Unified Scroll + Page Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home screen one vertical scroll (header → calendar → budget → list scroll together; bottom nav + button pinned), delete the redundant full-screen `BasketPage`/`BasketCharts` with its actions moving to a ⋮ "Basket options" sheet, render all three tabs with one shared row, and edit pantry quantities by tapping a row (this-week grams **and** default daily grams) instead of an inline field.

**Architecture:** Leaf-first. Tasks 1–4 build/adopt small components with exact code + tests. Tasks 5–6 are the `App.tsx` integration (remove the redundant page; then the scroll restructure) — structural work verified by the test suite + an on-device pass.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Jest + @testing-library/react-native. Reuses `settings/Stepper`, `ItemDetail`, existing App handlers.

**Conventions:** TDD (failing test first). Run `npx jest` (NEVER `npx expo start` — it hangs). Commit directly to `main`. Match insertion points on surrounding code, not exact line numbers.

---

## File Structure

- **Create:** `src/components/ItemRow.tsx` (shared list row), `src/components/BasketOptionsSheet.tsx` (⋮ menu).
- **Modify:** `MealPrepDetail.tsx`, `ExtrasPeriodList.tsx`, `PantryPeriodView.tsx` (use `ItemRow`; pantry loses its inline grams field), `ItemDetail.tsx` (pantry "this week" field), `App.tsx` (pantry save wiring, remove `BasketPage`, ⋮ wiring, single scroll, pinned nav/FAB).
- **Delete:** `src/components/BasketPage.tsx`, `src/components/BasketCharts.tsx` + their tests.

---

## Task 1: `ItemRow` shared row component

**Files:**
- Create: `src/components/ItemRow.tsx`
- Test: `__tests__/ItemRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/ItemRow.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import ItemRow from '../src/components/ItemRow'

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>{ui}</ThemeProvider>)

describe('ItemRow', () => {
  it('renders name, subtitle, and kcal value, and fires onPress', () => {
    const onPress = jest.fn()
    const { getByText, getByTestId } = wrap(
      <ItemRow emoji="🥛" name="Oatly" subtitle="1000 g · 610 kcal" kcal={610} onPress={onPress} testID="row" />
    )
    expect(getByText('Oatly')).toBeTruthy()
    expect(getByText('1000 g · 610 kcal')).toBeTruthy()
    expect(getByText('610')).toBeTruthy()
    fireEvent.press(getByTestId('row'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest ItemRow`
Expected: FAIL — `Cannot find module '../src/components/ItemRow'`.

- [ ] **Step 3: Create the component**

Create `src/components/ItemRow.tsx` (lifted from the `MealPrepDetail` card markup so the look is identical):

```tsx
import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  emoji: string
  name: string
  subtitle: string
  kcal: number
  onPress?: () => void
  testID?: string
}

export default function ItemRow({ emoji, name, subtitle, kcal, onPress, testID }: Props) {
  const colors = useColors()
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.itemCard, borderRadius: 18,
      paddingVertical: 11, paddingHorizontal: 13, marginBottom: 9,
      borderWidth: 1, borderColor: colors.line,
    },
    inner: { flexDirection: 'row', alignItems: 'center' },
    av: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
    avText: { fontSize: 23 },
    tx: { flex: 1 },
    nm: { fontFamily: fonts.head, fontWeight: '500', fontSize: 15.5, color: colors.forest },
    mt: { fontSize: 12, fontWeight: '600', color: colors.mossFaint, marginTop: 1 },
    kc: { alignItems: 'flex-end', marginLeft: 8 },
    kcVal: { fontFamily: fonts.head, fontWeight: '600', fontSize: 15, color: colors.matchaDeep },
    kcUnit: { fontSize: 9, fontWeight: '700', color: colors.mossFaint, marginTop: 1 },
  }), [colors])

  return (
    <View style={styles.card}>
      <TouchableOpacity testID={testID} style={styles.inner} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.av}><Text style={styles.avText}>{emoji || '🛒'}</Text></View>
        <View style={styles.tx}>
          <Text style={styles.nm} numberOfLines={1}>{name}</Text>
          <Text style={styles.mt}>{subtitle}</Text>
        </View>
        <View style={styles.kc}>
          <Text style={styles.kcVal}>{Math.round(kcal)}</Text>
          <Text style={styles.kcUnit}>KCAL</Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest ItemRow`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemRow.tsx __tests__/ItemRow.test.tsx
git commit -m "feat: shared ItemRow component for list rows"
```

---

## Task 2: Adopt `ItemRow` in all three lists; remove pantry inline grams field

**Files:**
- Modify: `src/components/MealPrepDetail.tsx`, `src/components/ExtrasPeriodList.tsx`, `src/components/PantryPeriodView.tsx`
- Test: `__tests__/MealPrepDetail.test.tsx`, `__tests__/CalendarStrip.test.tsx` (only if they assert removed markup — verify), `__tests__/App.*.test.tsx` (pantry-grams)

Context: each list currently has its own row markup. Replace the row markup with `ItemRow` so the three tabs match. **Keep** each component's existing inner `ScrollView` for now (the outer single scroll arrives in Task 6). For Pantry, remove the inline `pantry-grams` `TextInput` and the `onSetPantryGrams` prop — the row becomes tap-only (`onOpenPantry`).

- [ ] **Step 1: Check existing assertions first**

Run: `grep -rn "pantry-grams\|food-item\|edit-item\|extra-item\|open-extra\|open-pantry-item\|onSetPantryGrams" __tests__ src`
Note every hit — you must preserve the testIDs `food-item`/`edit-item` (basket), `extra-item`/`open-extra` (extras), `pantry-detail-row`/`open-pantry-item` (pantry), and remove only `pantry-grams`.

- [ ] **Step 2: Update `MealPrepDetail.tsx` to render `ItemRow`**

Replace the `.map` body (the `<View testID="food-item">…</View>` block, currently lines ~56–86) with `ItemRow`, preserving the wrapper testIDs by passing them through. Import `ItemRow` and keep the `formatWeight`/`formatEnergy` subtitle:

```tsx
// add import near the top:
import ItemRow from './ItemRow'
```

```tsx
// inside the ScrollView, replace the items .map with:
{activeCycle.items.map((item, idx) => {
  const qty = item.quantity ?? 1
  const total = item.kcal * qty
  return (
    <View key={idx} testID="food-item">
      <ItemRow
        testID="edit-item"
        emoji={item.emoji || '🛒'}
        name={`${item.name}${qty > 1 ? ` ×${qty}` : ''}`}
        subtitle={`${formatWeight(item.weightG, units)} · ${formatEnergy(total, units)}`}
        kcal={total}
        onPress={() => onEditItem?.(idx)}
      />
    </View>
  )
})}
```

(The unused `TouchableOpacity` import and old row styles in `MealPrepDetail` can be removed; leave the `container`/`ScrollView` as-is.)

- [ ] **Step 3: Update `ExtrasPeriodList.tsx` to render `ItemRow`**

Import `ItemRow`. Replace the card `.map` block (lines ~44–54) with:

```tsx
{extras.map((e) => {
  const { day, month } = formatDay(e.date)
  return (
    <View key={e.id} testID="extra-item">
      <ItemRow
        testID="open-extra"
        emoji="🍴"
        name={e.name}
        subtitle={`${day} ${month} · ${formatEnergy(e.kcal, units)}`}
        kcal={e.kcal}
        onPress={() => onOpenExtra?.(e.id)}
      />
    </View>
  )
})}
```

- [ ] **Step 4: Update `PantryPeriodView.tsx` — `ItemRow` + drop the inline field**

Import `ItemRow`. Remove `onSetPantryGrams` from `Props` and the destructure, remove the `gramsInput` style and the `TextInput`. Replace the `.map` block (lines ~51–69) with:

```tsx
{pantry.map((item) => {
  const grams = pantryGramsForCycle(item, cycle, cycleDays)
  const kcal = kcalForWeight(item.kcalPer100g, grams)
  return (
    <View key={item.id} testID="pantry-detail-row">
      <ItemRow
        testID="open-pantry-item"
        emoji={item.emoji}
        name={item.name}
        subtitle={`${grams} g · ${formatEnergy(kcal, units)}`}
        kcal={kcal}
        onPress={() => onOpenPantry?.(item.id)}
      />
    </View>
  )
})}
```

Remove the now-unused `TextInput` import.

- [ ] **Step 5: Remove the `onSetPantryGrams` prop from App's `PantryPeriodView` usages**

In `App.tsx`, both `<PantryPeriodView … />` elements pass `onSetPantryGrams={handleSetPantryGrams}` — remove that prop from both (keep `onOpenPantry`). `handleSetPantryGrams` stays in App (Task 3 reuses it).

Run: `grep -n "onSetPantryGrams" App.tsx` → expect no remaining matches after editing.

- [ ] **Step 6: Update tests that referenced the inline field**

Any test asserting `getByTestId('pantry-grams')` or `fireEvent.changeText` on it must be removed/rewritten to tap `open-pantry-item` instead. From Step 1's grep, update each.

Run: `npx jest MealPrepDetail PantryPeriodView ExtrasPeriodList App` (run the App suites too)
Expected: PASS (after updating any `pantry-grams` assertions).

- [ ] **Step 7: Full suite + tsc**

Run: `npx jest` → all green. Run: `npx tsc --noEmit 2>&1 | grep -E "MealPrepDetail|ExtrasPeriodList|PantryPeriodView|ItemRow|App\.tsx" || echo clean`

- [ ] **Step 8: Commit**

```bash
git add src/components/MealPrepDetail.tsx src/components/ExtrasPeriodList.tsx src/components/PantryPeriodView.tsx App.tsx __tests__
git commit -m "feat: shared ItemRow across basket/extras/pantry; drop pantry inline grams field"
```

---

## Task 3: Pantry detail edits this-week grams + default daily grams

**Files:**
- Modify: `src/components/ItemDetail.tsx`, `App.tsx`
- Test: `__tests__/ItemDetail.test.tsx`

Context: `ItemDetail` pantry mode currently edits Name / Calories-per-100g / Per-day(g). `savePantry()` calls `onSavePantry({ name, kcalPer100g, dailyG })`. We add a **This week (g)** field (the per-cycle total override) seeded from a new `pantryWeekG` prop, and include `thisWeekG` in the save patch. App routes `dailyG`→`handleSavePantryPatch` (the default) and `thisWeekG`→`handleSetPantryGrams` (this cycle's override).

- [ ] **Step 1: Write the failing test**

Add to `__tests__/ItemDetail.test.tsx` (match the file's existing render helper / imports):

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import ItemDetail from '../src/components/ItemDetail'

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>{ui}</ThemeProvider>)

describe('ItemDetail — pantry this-week + default', () => {
  const pantryItem = { id: 'p1', emoji: '🥫', name: 'Oats', kcalPer100g: 379, dailyG: 40 }

  it('edits this-week grams and default per-day, saving both', () => {
    const onSavePantry = jest.fn()
    const { getByText, getByTestId } = wrap(
      <ItemDetail visible kind="pantry" pantryItem={pantryItem} pantryWeekG={280} days={7}
        onSavePantry={onSavePantry} onRemove={() => {}} onClose={() => {}} />
    )
    fireEvent.press(getByText('Edit'))
    expect(getByTestId('id-pantry-week').props.value).toBe('280') // seeded from pantryWeekG
    fireEvent.changeText(getByTestId('id-pantry-week'), '350')
    fireEvent.changeText(getByTestId('id-pantry-daily'), '50')
    fireEvent.press(getByText('Save'))
    expect(onSavePantry).toHaveBeenCalledWith(
      expect.objectContaining({ kcalPer100g: 379, dailyG: 50, thisWeekG: 350 })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest ItemDetail -t "this-week"`
Expected: FAIL — `id-pantry-week` not found.

- [ ] **Step 3: Add the `pantryWeekG` prop + `thisWeekG` to the save type**

In `ItemDetail.tsx`, extend `Props`:

```tsx
  pantryItem?: PantryItem
  pantryWeekG?: number   // current total grams for this prep (override ?? dailyG*days)
```
and the save callback type:
```tsx
  onSavePantry?: (patch: { name?: string; kcalPer100g: number; dailyG: number; thisWeekG: number }) => void
```

- [ ] **Step 4: Seed + save the new field**

Add state near the other strings:
```tsx
  const [weekStr, setWeekStr] = useState('0')
```
In `seed()`, in the `kind === 'pantry'` branch, add:
```tsx
      setWeekStr(String(props.pantryWeekG ?? pantryItem.dailyG * days))
```
Update `savePantry()`:
```tsx
  function savePantry() {
    props.onSavePantry?.({
      name: name.trim() || pantryItem?.name || 'Staple',
      kcalPer100g: Math.max(0, Math.round(num(per100Str))),
      dailyG: Math.max(0, Math.round(num(dailyStr))),
      thisWeekG: Math.max(0, Math.round(num(weekStr))),
    })
    setEditing(false)
  }
```

- [ ] **Step 5: Render the field**

In the `editing && kind === 'pantry'` block, add the This-week field above Per-day:

```tsx
          {editing && kind === 'pantry' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-pantry-name', 'default', true)}
              {renderField('Calories / 100g', per100Str, setPer100Str, 'id-pantry-per100')}
              {renderField('This week (g)', weekStr, setWeekStr, 'id-pantry-week')}
              {renderField('Per day (g)', dailyStr, setDailyStr, 'id-pantry-daily')}
            </View>
          )}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest ItemDetail`
Expected: PASS (new test + existing ItemDetail tests).

- [ ] **Step 7: Wire App to save both**

In `App.tsx`, pass `pantryWeekG` and route the save. At the `<ItemDetail>` element, add the prop (compute the current total for the active cycle):

```tsx
            pantryWeekG={
              detailTarget.kind === 'pantry' && activeCycle
                ? pantryGramsForCycle(livePantry.find((p) => p.id === detailTarget.id)!, activeCycle, activeDayCount)
                : undefined
            }
```
(Use the same `days`/`activeDayCount` value already passed to `ItemDetail`'s `days` prop; import `pantryGramsForCycle` from `./src/utils/nutrition` if not already imported.)

Update `onSavePantry`:
```tsx
            onSavePantry={(patch) => {
              if (detailTarget.kind !== 'pantry') return
              handleSavePantryPatch(detailTarget.id, { kcalPer100g: patch.kcalPer100g, dailyG: patch.dailyG })
              handleSetPantryGrams(detailTarget.id, patch.thisWeekG)
            }}
```
(`handleSavePantryPatch` also spreads `name` if present; pass `name` through if the existing handler supports it — it spreads `...patch`, so include `name: patch.name` in the object if you want the rename saved: `{ name: patch.name, kcalPer100g: patch.kcalPer100g, dailyG: patch.dailyG }`. Verify `handleSavePantryPatch`'s body spreads the patch — it does: `touch({ ...p, ...patch })`.)

- [ ] **Step 8: Verify the `days` value matches the cycle length used for the override**

`handleSetPantryGrams` stores `thisWeekG` directly as the cycle override total, and `pantryGramsForCycle` reads that override back. Confirm `pantryWeekG` is computed with the **same** day count passed to `ItemDetail`'s `days` prop so the seed round-trips. Run: `grep -n "days={" App.tsx` near the `<ItemDetail>` usage to confirm the day count source, and use it for both.

- [ ] **Step 9: Full suite + tsc, commit**

Run: `npx jest` → green. `npx tsc --noEmit 2>&1 | grep -E "ItemDetail|App\.tsx" || echo clean`
```bash
git add src/components/ItemDetail.tsx App.tsx __tests__/ItemDetail.test.tsx
git commit -m "feat: pantry detail edits this-week grams + default per-day"
```

---

## Task 4: `BasketOptionsSheet` (the ⋮ menu)

**Files:**
- Create: `src/components/BasketOptionsSheet.tsx`
- Test: `__tests__/BasketOptionsSheet.test.tsx`

Context: a small bottom sheet with a prep-length `Stepper` (reusing `settings/Stepper`, 1–14) and a Delete action. Delete calls `onDelete` (App's `handleDeleteCycle`, which already shows its own Alert confirm). Same Modal+scrim pattern as other sheets.

- [ ] **Step 1: Write the failing test**

Create `__tests__/BasketOptionsSheet.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import BasketOptionsSheet from '../src/components/BasketOptionsSheet'

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>{ui}</ThemeProvider>)

describe('BasketOptionsSheet', () => {
  it('steps the prep length and fires delete', () => {
    const onDaysChange = jest.fn()
    const onDelete = jest.fn()
    const { getByTestId, getByText } = wrap(
      <BasketOptionsSheet visible dayCount={7} startDate="2026-06-22" dailyGoal={2000}
        onDaysChange={onDaysChange} onDelete={onDelete} onClose={() => {}} />
    )
    fireEvent.press(getByTestId('prep-days-inc'))
    expect(onDaysChange).toHaveBeenCalledWith(8)
    fireEvent.press(getByText('Delete basket'))
    expect(onDelete).toHaveBeenCalled()
  })
})
```

(`settings/Stepper` exposes `prep-days-inc`/`prep-days-dec` testIDs when given `testID="prep-days"`. Confirm by reading `src/components/settings/Stepper.tsx`; it derives child testIDs from the base testID.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest BasketOptionsSheet`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/BasketOptionsSheet.tsx`:

```tsx
import React, { useMemo } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Stepper from './settings/Stepper'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { addDays, formatLong } from '../utils/dates'
import { cycleBudget } from '../utils/nutrition'

type Props = {
  visible: boolean
  dayCount: number
  startDate: string
  dailyGoal: number
  onDaysChange: (days: number) => void
  onDelete: () => void
  onClose: () => void
}

export default function BasketOptionsSheet({ visible, dayCount, startDate, dailyGoal, onDaysChange, onDelete, onClose }: Props) {
  const colors = useColors()
  const styles = useMemo(() => StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    scrimFill: { flex: 1 },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    title: { fontFamily: fonts.head, fontSize: 19, color: colors.forest, marginBottom: 14 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 9 },
    rowLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    foot: { fontFamily: fonts.body, fontSize: 12, color: colors.mossFaint, marginBottom: 14 },
    del: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, marginTop: 4 },
    delTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.roseDeep },
  }), [colors])

  const end = addDays(startDate, Math.max(0, dayCount - 1))
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title}>Basket options</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prep length</Text>
            <Stepper value={dayCount} min={1} max={14} onChange={onDaysChange} testID="prep-days" />
          </View>
          <Text style={styles.foot}>
            {formatLong(startDate)} → {formatLong(end)} · {cycleBudget(dayCount, dailyGoal).toLocaleString()} kcal budget
          </Text>
          <TouchableOpacity style={styles.del} onPress={onDelete} testID="delete-basket">
            <Text style={styles.delTxt}>Delete basket</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
```

(Verify `Stepper`'s prop names — `value`/`min`/`max`/`onChange`/`testID` — against `src/components/settings/Stepper.tsx`; it's the same one `AddItemSheet`/`NewPeriodPanel` use. Adjust if the suffix testIDs differ.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest BasketOptionsSheet`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BasketOptionsSheet.tsx __tests__/BasketOptionsSheet.test.tsx
git commit -m "feat: BasketOptionsSheet (prep length + delete)"
```

---

## Task 5: Remove `BasketPage`/`BasketCharts`; wire the ⋮ menu

**Files:**
- Modify: `App.tsx`
- Delete: `src/components/BasketPage.tsx`, `src/components/BasketCharts.tsx`, `__tests__/BasketPage*.test.tsx`, `__tests__/BasketCharts*.test.tsx` (whichever exist)
- Test: `__tests__/App.*.test.tsx`

This is App integration work — hold `App.tsx` in context and edit carefully. Each step is concrete.

- [ ] **Step 1: Inventory the entry points**

Run: `grep -rn "BasketPage\|BasketCharts\|basketPageOpen\|Open basket\|pull up for full view" App.tsx src __tests__`
This lists every reference to remove/update.

- [ ] **Step 2: Add `basketOptionsOpen` state + the sheet**

In `App.tsx`, near the other sheet-visibility state, add:
```tsx
  const [basketOptionsOpen, setBasketOptionsOpen] = useState(false)
```
Import the new sheet:
```tsx
import BasketOptionsSheet from './src/components/BasketOptionsSheet'
```
Render it near the other modals (e.g. beside `<ItemDetail>`), only when there's an active cycle:
```tsx
        {activeCycle && (
          <BasketOptionsSheet
            visible={basketOptionsOpen}
            dayCount={activeDayCount}
            startDate={activeCycle.startDate}
            dailyGoal={dailyGoal}
            onDaysChange={handleChangeDays}
            onDelete={() => { setBasketOptionsOpen(false); handleDeleteCycle() }}
            onClose={() => setBasketOptionsOpen(false)}
          />
        )}
```

- [ ] **Step 3: Add the ⋮ button to the basket list header**

The basket branch currently shows a title ("This basket · pull up for full view") and an "Open basket ›" affordance. Replace that header with a row: the title on the left and a ⋮ button on the right that opens the options sheet. Use a `TouchableOpacity testID="basket-options-button"` containing `⋮` that calls `setBasketOptionsOpen(true)`. Remove the "pull up for full view" / "Open basket" text and handlers.

- [ ] **Step 4: Remove all `BasketPage` wiring**

Delete from `App.tsx`: the `import BasketPage`, `import BasketCharts` (and any `BasketCharts` usage), the `basketPageOpen` state, the entire `<BasketPage … />` element, and the "Open basket" entry handler/`setBasketPageOpen` calls.

Run: `grep -n "BasketPage\|BasketCharts\|basketPageOpen" App.tsx` → expect **no** matches.

- [ ] **Step 5: Delete the component files + their tests**

```bash
git rm src/components/BasketPage.tsx src/components/BasketCharts.tsx
git rm __tests__/BasketPage*.test.tsx __tests__/BasketCharts*.test.tsx 2>/dev/null || true
```
(If `BasketCharts` is imported anywhere else, `grep -rn "BasketCharts" src` and remove those usages too.)

- [ ] **Step 6: Update App tests**

Run: `grep -rln "Open basket\|pull up for full view\|BasketPage\|basketPageOpen" __tests__`
For each hit, remove the assertion or rewrite it to the new ⋮ flow (e.g. `fireEvent.press(getByTestId('basket-options-button'))` → `getByText('Basket options')`). Add at least one test: pressing `basket-options-button` shows the options sheet; the prep stepper there calls the day-change path.

- [ ] **Step 7: Full suite + tsc**

Run: `npx jest` → green. `npx tsc --noEmit 2>&1 | grep -E "App\.tsx" || echo "App clean"`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: remove redundant basket page; prep-length + delete via ⋮ options sheet"
```

---

## Task 6: Single vertical scroll + pinned nav/FAB

**Files:**
- Modify: `App.tsx`, `src/components/MealPrepDetail.tsx`, `src/components/ExtrasPeriodList.tsx`, `src/components/PantryPeriodView.tsx`
- Test: `__tests__/App.*.test.tsx`

The structural finale. Goal: one outer vertical `ScrollView` holds header + calendar + budget + the active list; `SegmentedNav` and `AddFab` are pinned (absolute) over it. Remove the manual collapse animation and the inner `ScrollView`s.

- [ ] **Step 1: Remove inner `ScrollView`s from the three list components**

In `MealPrepDetail.tsx`, `ExtrasPeriodList.tsx`, `PantryPeriodView.tsx`, replace each component's inner `<ScrollView …>…</ScrollView>` with a plain `<View>` (or fragment) rendering the same children — the outer App scroll now handles scrolling. Keep `contentContainerStyle` paddings as `style`/wrapper padding where they mattered (e.g. MealPrepDetail's `paddingBottom` is no longer needed — the App scroll supplies bottom padding in Step 4). Remove now-unused `ScrollView` imports.

Run: `npx jest MealPrepDetail ExtrasPeriodList PantryPeriodView` → green (these tests assert content, not scrolling).

- [ ] **Step 2: Build the single outer scroll in `App.tsx`**

Replace the current layout — the pinned `Animated.View` header, the pinned calendar `Animated.View`, and the `detailArea`/`basketSheet` branches — with a single `<ScrollView>` whose children are, in order: the greeting header, the calendar strip + timeline (the existing **horizontal** `ScrollView` stays, nested), the `BudgetBar`, then the active-state content (normal items list / empty "new shop" panel / extra-day `ExtraMealDetail`). Give the scroll `contentContainerStyle={{ paddingBottom: 140 }}` so the last rows clear the pinned bar.

Target skeleton:
```tsx
<SafeAreaView style={styles.safe}>
  <View style={styles.container}>
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
      {/* greeting header (Hi + 🥫 + ⚙️) — was the first Animated.View, now a plain View */}
      {/* calendar + timeline — keep the inner horizontal ScrollView */}
      {/* BudgetBar */}
      {/* active content: items list | new-shop panel | extra-day detail */}
    </ScrollView>
    {/* pinned bottom bar — rendered ONCE, absolute */}
    <View style={styles.pinnedBar} pointerEvents="box-none">
      <SegmentedNav active={weeklyTab} onChange={setWeeklyTab} />
      {/* AddFab (when applicable for the active tab/state) */}
    </View>
    {/* …existing modals (AddItemSheet, ItemDetail, BasketOptionsSheet, the loading overlay, etc.) */}
  </View>
</SafeAreaView>
```

- [ ] **Step 3: De-duplicate the nav/FAB**

The current render has the `SegmentedNav` + `AddFab` block **twice** (once in the empty-cycle branch, once in the items branch). Render them **once** in the pinned bar (Step 2). Keep the existing conditional logic for which tab's add action fires (`weeklyTab === 'extras' ? handleAddExtraForPeriod : handleAddManual`, `manualOnly` for extras, hidden on pantry) — move that logic into the single pinned `AddFab`. For the extra-day mode (`activeExtraDate`), keep its dedicated `manualOnly` AddFab behavior.

- [ ] **Step 4: Remove the collapse machinery**

Delete: `headerH`, `calH`, `budgetH` state + their `setHeaderH/setCalH/setBudgetH`, the `onLayout` measurers, the `collapseStyle` helper, and the scroll-driven `Animated` collapse. The header/calendar/budget are now plain children that scroll naturally. Keep `scrollRef` only if still used for the horizontal calendar auto-scroll (`scrollTo`); otherwise remove it.

Run: `grep -n "collapseStyle\|headerH\|calH\|budgetH" App.tsx` → expect no matches.

- [ ] **Step 5: Add the `pinnedBar` style**

```tsx
    pinnedBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingHorizontal: 16, paddingBottom: 10,
    },
```
(Match the existing `navWrap`/FAB placement; `pointerEvents="box-none"` lets taps fall through the empty area to the scroll.)

- [ ] **Step 6: Update App tests for the new structure**

Run: `grep -rln "pull up for full view\|basketSheet\|navWrap\|collapse" __tests__`
Update any test asserting the old two-scroll structure. The behavioural tests (add item, switch tab, open detail) should still pass unchanged since testIDs are preserved — run them and fix only structural assertions.

Run: `npx jest` → all green. `npx tsc --noEmit 2>&1 | grep -E "App\.tsx|MealPrepDetail|ExtrasPeriodList|PantryPeriodView" || echo clean`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: unified single-scroll home with pinned nav + add button"
```

- [ ] **Step 8: On-device verification (cannot run in jest)**

Rebuild to the phone and confirm: the whole page scrolls as one (header/calendar/budget scroll away); the Basket/Extras/Pantry nav + the + button stay pinned and reachable while scrolled; switching tabs swaps the list in place; the ⋮ opens Basket options (prep length + delete); tapping a pantry row opens the sheet and edits this-week + default grams; extras/pantry rows look identical to basket rows.

---

## Self-Review

**Spec coverage:**
- One vertical scroll, header/calendar/budget/list scroll together → Task 6 ✓
- Bottom nav + button pinned → Task 6 (Steps 2–3, 5) ✓
- Remove `BasketPage` + `BasketCharts` → Task 5 ✓
- Prep-length + delete via ⋮ menu → Task 4 (sheet) + Task 5 (wiring) ✓
- Charts dropped → Task 5 (delete `BasketCharts`) ✓
- Shared row across all three tabs → Task 1 + Task 2 ✓
- Pantry tap-to-edit, inline field removed → Task 2 (remove field) + Task 3 (sheet) ✓
- Pantry sheet edits this-week **and** default grams → Task 3 ✓
- 🥫 PantryScreen / extra-day / new-shop unchanged → none of Tasks 1–6 alter their internals (Task 6 only swaps their container) ✓

**Placeholder scan:** Tasks 1–4 have complete code. Tasks 5–6 are integration tasks with concrete removal anchors, target skeletons, and exact grep/verify commands — the residual judgment (final JSX assembly of `App.tsx`) is inherent to restructuring a 1,100-line render and is bounded by the listed removals + skeleton + preserved testIDs.

**Type/name consistency:** `ItemRow` props (`emoji/name/subtitle/kcal/onPress/testID`) are used identically in Tasks 1–2 and 6. `onSavePantry` patch gains `thisWeekG` in Task 3 and App consumes it there. `BasketOptionsSheet` props (`visible/dayCount/startDate/dailyGoal/onDaysChange/onDelete/onClose`) match between Task 4 and Task 5. testIDs preserved: `food-item`,`edit-item`,`extra-item`,`open-extra`,`pantry-detail-row`,`open-pantry-item`; removed: `pantry-grams`; added: `id-pantry-week`,`basket-options-button`,`delete-basket`.
