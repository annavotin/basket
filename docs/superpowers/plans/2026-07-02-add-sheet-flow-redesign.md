# Add-sheet Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Declutter the add-item sheet: hide everything but the search bar until a food is chosen or typed, label weight as "per pack," and only show "Save to My Foods" when the item is genuinely new or has been edited.

**Architecture:** All changes are within `src/components/AddItemSheet.tsx`'s existing state/render logic — no new components, no data-model changes. Three derived booleans drive the new behavior: `hasTypedOrChosen` (progressive disclosure), `showSaveToggle` (dirty-vs-original gating, via a new `original` snapshot), and an extended `showEditButton` (Summary/Edit split now applies to search-picked foods too, not just scanned ones).

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Jest + @testing-library/react-native.

**Reference:** Spec at `docs/superpowers/specs/2026-07-02-add-sheet-flow-redesign-design.md`. All line numbers below refer to `src/components/AddItemSheet.tsx` as it exists at the start of this branch (`feat/add-sheet-redesign`, commit `676735e`).

**Out of scope, do not touch:** `showScanRow`/`onScanBarcode`/`onScanReceipt` (line 439) is pre-existing dead code — computed but never rendered in this file (scan buttons live elsewhere in the app). Leave it as-is; it's not part of this redesign.

**Conventions:** run `npx jest __tests__/AddItemSheet.test.tsx`; keep `npx tsc --noEmit` and the full suite green. No em dashes in user-facing strings.

---

## Task 1: "Weight per pack" label + progressive disclosure

**Files:**
- Modify: `src/components/AddItemSheet.tsx:386` (weightLabel), `:701-783` (Quantity/kcal-preview/toggle-group/Add-button)
- Test: `__tests__/AddItemSheet.test.tsx`

### What changes
1. `weightLabel` (line 386) gains "per pack": `'Weight per pack (oz)'` / `'Weight per pack (g)'`. This single constant already drives every weight field label in the file (the custom card and the edit-mode weight input both read `weightLabel`), so this is a one-line change with no other call sites to update.
2. A new derived boolean gates Quantity, the kcal preview, the toggle group (Save to My Foods / Link a barcode / Keep scanning), and the Add button, so a freshly-opened sheet with nothing chosen/typed shows only the title, search bar, and (while a search is in flight) suggestions:
   ```ts
   // True once there's something to act on: a product/suggestion is chosen, an active scan
   // is in flight (found or not), or the user has started typing their own item.
   const hasTypedOrChosen = !isManual || pickedSuggestion || scanned || name.trim().length > 0
   ```
   `!isManual` covers scanned-and-found (product set); `scanned` alone covers scanned-but-not-found (product null, scanned true — the user already took a deliberate action, so don't hide the manual-entry affordances they need); `name.trim().length > 0` covers manual typing. Cancel stays always visible (the user's only way out of a still-empty sheet).

### Step 1: Write the failing tests

Add to `__tests__/AddItemSheet.test.tsx`, inside `describe('AddItemSheet — manual mode', ...)`:

```tsx
it('shows only the search bar on a fresh open, before typing or picking anything', () => {
  const { getByTestId, queryByTestId } = render(
    <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
  )
  expect(getByTestId('manual-name-input')).toBeTruthy()
  expect(queryByTestId('qty')).toBeNull()
  expect(queryByTestId('toggle-save-to-foods')).toBeNull()
  expect(queryByTestId('add-item-button')).toBeNull()
  expect(getByTestId('cancel-button')).toBeTruthy() // always reachable
})

it('reveals quantity, toggles, and the add button once a name is typed', () => {
  const { getByTestId } = render(
    <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
  )
  fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
  expect(getByTestId('qty')).toBeTruthy()
  expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
  expect(getByTestId('add-item-button')).toBeTruthy()
})

it('labels the weight field "per pack"', () => {
  const { getByTestId, getByText } = render(
    <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
  )
  fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
  expect(getByText('Weight per pack (g)')).toBeTruthy()
})
```

Also **update** two existing tests that currently assert toggle/quantity presence on a `product=null` sheet **before** typing a name (they exercised the exact overwhelming-empty-state behavior this task removes):

Replace this test in `describe('AddItemSheet — scan toggles', ...)`:
```tsx
  it('shows Save to My Foods (default on) but hides Keep-scanning + Edit on a manual add (not scanned)', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
    expect(queryByTestId('toggle-keep-scanning')).toBeNull()
    expect(queryByTestId('edit-product-button')).toBeNull()
  })
```
with:
```tsx
  it('shows Save to My Foods (default on) but hides Keep-scanning + Edit on a manual add (not scanned)', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Something') // reveal the toggle group
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
    expect(queryByTestId('toggle-keep-scanning')).toBeNull()
    expect(queryByTestId('edit-product-button')).toBeNull()
  })
```

And in `describe('AddItemSheet — Save to My Foods', ...)`, the `'resets to default ON when the sheet reopens...'` test presses `toggle-save-to-foods` on a fresh `product=null` sheet before typing. Update its middle section (everything else in the test stays the same):
```tsx
    rerender(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'placeholder') // reveal the toggle group
    fireEvent.press(getByTestId('toggle-save-to-foods')) // true -> false
```
(the rest of the test — the reopen `rerender` calls and the final `changeText`/`add-item-button` assertions — is unchanged).

### Step 2: Run, expect FAIL

Run: `npx jest __tests__/AddItemSheet.test.tsx -t "shows only the search bar"`
Expected: FAIL (`qty`/`toggle-save-to-foods`/`add-item-button` currently render unconditionally).

### Step 3: Implement

In `src/components/AddItemSheet.tsx`, change line 386:
```ts
  const weightLabel = isOz ? 'Weight per pack (oz)' : 'Weight per pack (g)'
```

Add the new derived boolean right after `const showEditButton = ...` (line 408), so it sits with the other derived flags:
```ts
  const showEditButton = scanned && !isManual && !editing
  // True once there's something to act on: a product/suggestion is chosen, an active scan
  // is in flight (found or not), or the user has started typing their own item. Gates
  // Quantity/toggles/Add so a freshly-opened sheet shows only the search bar.
  const hasTypedOrChosen = !isManual || pickedSuggestion || scanned || name.trim().length > 0
```

Wrap the Quantity row, kcal preview, toggle group, and Add button (currently lines 701-783) in `{hasTypedOrChosen && (<>...</>)}`. Replace:
```tsx
                {/* ── QUANTITY ── */}
                <View style={styles.qtyRow}>
```
through
```tsx
                </TouchableOpacity>

                {/* ── CANCEL ── */}
```
with:
```tsx
                {hasTypedOrChosen && (
                  <>
                    {/* ── QUANTITY ── */}
                    <View style={styles.qtyRow}>
                      <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Quantity</Text>
                      <Stepper value={qty} min={1} max={99} onChange={setQty} testID="qty" />
                    </View>

                    {/* ── KCAL PREVIEW (only once there's something to total) ── */}
                    {perUnitKcal > 0 && (
                      <Text style={styles.kcalPreview} testID="kcal-preview">
                        {qty > 1
                          ? `${formatEnergy(perUnitKcal, units)} × ${qty} = ${formatEnergy(perUnitKcal * qty, units)}`
                          : formatEnergy(perUnitKcal, units)}
                      </Text>
                    )}

                    {/* ── TOGGLES (Save to My Foods always shown; Keep scanning on scan-opened sheets) ── */}
                    <View style={styles.toggleGroup}>
                      <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelWrap}>
                          <Text style={styles.toggleLabel}>{saveLabel}</Text>
                          <Text style={styles.toggleHint}>
                            {matchedFood ? 'Refresh the saved details with what you entered' : 'Preload it next time you add this item'}
                          </Text>
                        </View>
                        <Toggle
                          value={saveToFoods}
                          onValueChange={setSaveToFoods}
                          testID="toggle-save-to-foods"
                        />
                      </View>
                      {isManual && (
                        <>
                          <View style={styles.toggleDivider} />
                          {effectiveBarcode ? (
                            <View style={styles.toggleRow}>
                              <View style={styles.toggleLabelWrap}>
                                <Text style={styles.toggleLabel}>Barcode linked ✓</Text>
                                <Text style={styles.toggleHint}>Next scan of this item will find it</Text>
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity
                              testID="link-barcode-button"
                              style={styles.toggleRow}
                              onPress={handleLinkBarcode}
                              accessibilityLabel="Link a barcode"
                            >
                              <View style={styles.toggleLabelWrap}>
                                <Text style={styles.toggleLabel}>Link a barcode</Text>
                                <Text style={styles.toggleHint}>Scan the pack so this item is found next time</Text>
                              </View>
                              <BarcodeIcon size={20} color={colors.forest} />
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                      {scanned && (
                        <>
                          <View style={styles.toggleDivider} />
                          <View style={styles.toggleRow}>
                            <View style={styles.toggleLabelWrap}>
                              <Text style={styles.toggleLabel}>Keep scanning</Text>
                              <Text style={styles.toggleHint}>Reopen the scanner after you add</Text>
                            </View>
                            <Toggle
                              value={keepScanning}
                              onValueChange={onKeepScanning ?? (() => {})}
                              testID="toggle-keep-scanning"
                            />
                          </View>
                        </>
                      )}
                    </View>

                    {/* ── ADD BUTTON ── */}
                    <TouchableOpacity
                      testID="add-item-button"
                      style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                      onPress={handleAdd}
                      disabled={!canAdd}
                    >
                      <Text style={styles.addBtnText}>Add to period</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* ── CANCEL ── */}
```
(Everything below — the Cancel button — is untouched, still renders unconditionally.)

**Do not** change the `toggleGroup`'s internal contents beyond this wrapping in this task — the Save-to-My-Foods dirty-gating and the empty-card guard are Task 2's concern.

### Step 4: Run, expect PASS

Run: `npx jest __tests__/AddItemSheet.test.tsx`
Expected: all pass. Then `npx tsc --noEmit` clean, and full `npx jest` for regressions (this touches App-integration tests that render the sheet — verify none assert on hidden elements before typing/picking; if any do, add a `changeText`/pick step before the assertion, matching the pattern above).

### Step 5: Commit

```bash
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: progressive disclosure in add sheet + weight-per-pack label"
```

---

## Task 2: "Save to My Foods" only when new or edited

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (module-level `macrosEqual` helper; `original` state; the `product` effect at `:315-348`; `pick()` at `:365-382`; `isDirty`/`showSaveToggle` near `:408-416`; `handleAdd` at `:423-436`; the toggle-group JSX from Task 1)
- Test: `__tests__/AddItemSheet.test.tsx`

### What changes
- A new `original` snapshot (`{ weightG, kcalPer100g, macrosPer100g } | null`) captures the picked/scanned food's starting values. `null` means "there's no prior version — this is a brand-new food" (fully custom entry).
- `showSaveToggle = original === null || isDirty` — visible for a fully-custom item (always), or for a picked/scanned item only once its weight or nutrition has actually changed from `original`.
- The value passed to `onAdd`'s `save` field becomes `showSaveToggle && saveToFoods` — so an unedited picked/scanned item is never silently (re-)saved to My Foods, matching the toggle being hidden for it. (Confirmed with the user: this is the deliberate, intended behavior.)
- The toggle group no longer renders an orphan divider or an empty card when nothing inside it has anything to show.

### Step 1: Write the failing tests

Add to `__tests__/AddItemSheet.test.tsx`, in a new `describe`:

```tsx
describe('AddItemSheet — Save to My Foods only when new or edited', () => {
  const scanned: Product = { name: 'Oatly', emoji: '🥛', packageWeightG: 1000, kcalPer100g: 61 }

  it('hides the save toggle for a picked/scanned food that has not been changed', () => {
    const { queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
  })

  it('reveals the save toggle once weight is edited away from the original', () => {
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('edit-product-button'))
    fireEvent.changeText(getByTestId('weight-input'), '500')
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
  })

  it('does not save an unchanged picked/scanned item, even though the internal toggle default is on', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly' }), { save: false })
  })

  it('always shows the save toggle for a fully-custom typed item', () => {
    const { getByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Home Hummus')
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
  })
})
```

Also **rewrite** these existing tests, which currently assert the pre-redesign "always visible/always saved" behavior:

Replace the `'found scan: Edit button + Keep-scanning + Save to My Foods, all before editing'` test in `describe('AddItemSheet — scan toggles', ...)` with:
```tsx
  it('found scan: Edit button + Keep-scanning shown before editing; Save to My Foods stays hidden until changed', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('edit-product-button')).toBeTruthy()
    expect(getByTestId('toggle-keep-scanning')).toBeTruthy()
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
  })
```

Replace `'reveals editable fields after tapping Edit; Save to My Foods stays visible throughout'` with:
```tsx
  it('reveals editable fields after tapping Edit; Save to My Foods appears once something changes', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
    fireEvent.press(getByTestId('edit-product-button'))
    expect(queryByTestId('toggle-save-to-foods')).toBeNull() // still unedited
    expect(getByTestId('edit-name-input')).toBeTruthy()
    expect(getByTestId('weight-input')).toBeTruthy()
    expect(getByTestId('nf-kcal')).toBeTruthy()
    expect(queryByTestId('edit-product-button')).toBeNull() // Edit hides once editing
    fireEvent.changeText(getByTestId('weight-input'), '750')
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy() // now dirty
  })
```

Replace `'toggling Save to My Foods off carries save:false into onAdd'` with:
```tsx
  it('toggling Save to My Foods off (after an edit reveals it) carries save:false into onAdd', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('edit-product-button'))
    fireEvent.changeText(getByTestId('weight-input'), '500') // dirty -> toggle appears, defaults on
    fireEvent.press(getByTestId('toggle-save-to-foods'))     // true -> false
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly' }), { save: false })
  })
```

Replace `'still emits the item on Add (found, from summary), saving by default'` with:
```tsx
  it('still emits the item on Add (found, from summary) — unedited, so it is not (re)saved', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly', source: 'barcode' }), { save: false })
  })
```

### Step 2: Run, expect FAIL

Run: `npx jest __tests__/AddItemSheet.test.tsx -t "Save to My Foods only when new or edited"`
Expected: FAIL — `toggle-save-to-foods` currently always renders, and `save` is currently always `saveToFoods` (default `true`) regardless of edits.

### Step 3: Implement

Add a module-level helper above the component (after the `Props` type, before `export default function AddItemSheet`):
```ts
function macrosEqual(a?: Macros, b?: Macros): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return a.protein === b.protein && a.carbs === b.carbs && a.fat === b.fat
}
```

Add new state alongside `linkedBarcode` (line 62):
```ts
  const [linkedBarcode, setLinkedBarcode] = useState<string | null>(null)
  // Snapshot of the picked/scanned food's starting values, for dirty-checking. null means
  // there's no prior version to compare against — this is a brand-new (fully custom) food.
  const [original, setOriginal] = useState<{ weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros } | null>(null)
```

In the `product` effect (lines 315-348), replace the whole effect body with:
```ts
  useEffect(() => {
    if (product) {
      const unknownWeight = product.packageWeightG <= 0
      const srvs = product.servings ?? []
      const initialWeightG = srvs.length > 0 ? srvs[0].weightG : (unknownWeight ? 0 : product.packageWeightG)
      setName(product.name)
      setWeight(initialWeightG > 0 ? String(initialWeightG) : '')
      setEmoji(product.emoji)
      setMacrosPer100g(product.macrosPer100g)
      setEditing(unknownWeight)
      setKcalPer100g(product.kcalPer100g)
      setServings(srvs)
      setServingIdx(srvs.length > 0 ? 0 : null)
      setOriginal({ weightG: initialWeightG, kcalPer100g: product.kcalPer100g, macrosPer100g: product.macrosPer100g })
    } else {
      setName('')
      setWeight('')
      setKcalPer100g(null)
      setMacrosPer100g(undefined)
      setEmoji('🛒')
      setEditing(false)
      setServings([])
      setServingIdx(null)
      setOriginal(null)
    }
    setPickedSuggestion(false)
    setQty(1)
    setDropdownOpen(false)
    setSaveToFoods(true)
    setLinkedBarcode(null)
  }, [product, visible])
```
(This is a consolidation of the existing duplicate `setWeight` calls into one `initialWeightG` computation, plus the new `setOriginal` calls — net-equivalent weight/serving behavior to before.)

In `pick()` (lines 365-382), add a snapshot after the existing assignments — replace:
```ts
  function pick(s: FoodSuggestion) {
    setName(s.name)
    setKcalPer100g(s.kcalPer100g)
    setEmoji(s.emoji)
    setMacrosPer100g(s.macrosPer100g)
    setPickedSuggestion(true)
    const srvs = s.servings ?? []
    setServings(srvs)
    if (srvs.length > 0) {
      setServingIdx(0)
      setWeight(String(srvs[0].weightG))
    } else {
      setServingIdx(null)
      if (s.packageWeightG) setWeight(String(s.packageWeightG))
    }
    setDropdownOpen(false)
    Keyboard.dismiss()
  }
```
with:
```ts
  function pick(s: FoodSuggestion) {
    setName(s.name)
    setKcalPer100g(s.kcalPer100g)
    setEmoji(s.emoji)
    setMacrosPer100g(s.macrosPer100g)
    setPickedSuggestion(true)
    const srvs = s.servings ?? []
    setServings(srvs)
    const initialWeightG = srvs.length > 0 ? srvs[0].weightG : (s.packageWeightG || 0)
    if (srvs.length > 0) {
      setServingIdx(0)
      setWeight(String(srvs[0].weightG))
    } else {
      setServingIdx(null)
      if (s.packageWeightG) setWeight(String(s.packageWeightG))
    }
    setOriginal({ weightG: initialWeightG, kcalPer100g: s.kcalPer100g, macrosPer100g: s.macrosPer100g })
    setDropdownOpen(false)
    Keyboard.dismiss()
  }
```

Add `isDirty`/`showSaveToggle` right after `hasTypedOrChosen` (added in Task 1):
```ts
  const hasTypedOrChosen = !isManual || pickedSuggestion || scanned || name.trim().length > 0
  const isDirty = original != null && (
    weightNum !== original.weightG ||
    kcalPer100g !== original.kcalPer100g ||
    !macrosEqual(macrosPer100g, original.macrosPer100g)
  )
  const showSaveToggle = original === null || isDirty
```
(`weightNum` and `kcalPer100g` are already in scope above this point in the file.)

In `handleAdd` (line 423-436), change the `save` field:
```ts
    }, { save: showSaveToggle && saveToFoods, barcode: effectiveBarcode ?? undefined })
```

Finally, update the toggle-group JSX from Task 1: gate the Save-to-My-Foods row on `showSaveToggle`, make the barcode block's leading divider conditional on `showSaveToggle` (so it doesn't float alone at the top when the save row is hidden), make the keep-scanning block's leading divider conditional on there being anything above it, and don't render the whole card when it would be empty. Replace:
```tsx
                    <View style={styles.toggleGroup}>
                      <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelWrap}>
                          <Text style={styles.toggleLabel}>{saveLabel}</Text>
                          <Text style={styles.toggleHint}>
                            {matchedFood ? 'Refresh the saved details with what you entered' : 'Preload it next time you add this item'}
                          </Text>
                        </View>
                        <Toggle
                          value={saveToFoods}
                          onValueChange={setSaveToFoods}
                          testID="toggle-save-to-foods"
                        />
                      </View>
                      {isManual && (
                        <>
                          <View style={styles.toggleDivider} />
                          {effectiveBarcode ? (
```
with:
```tsx
                    {(showSaveToggle || isManual || scanned) && (
                    <View style={styles.toggleGroup}>
                      {showSaveToggle && (
                        <View style={styles.toggleRow}>
                          <View style={styles.toggleLabelWrap}>
                            <Text style={styles.toggleLabel}>{saveLabel}</Text>
                            <Text style={styles.toggleHint}>
                              {matchedFood ? 'Refresh the saved details with what you entered' : 'Preload it next time you add this item'}
                            </Text>
                          </View>
                          <Toggle
                            value={saveToFoods}
                            onValueChange={setSaveToFoods}
                            testID="toggle-save-to-foods"
                          />
                        </View>
                      )}
                      {isManual && (
                        <>
                          {showSaveToggle && <View style={styles.toggleDivider} />}
                          {effectiveBarcode ? (
```
and further down, replace:
```tsx
                      {scanned && (
                        <>
                          <View style={styles.toggleDivider} />
                          <View style={styles.toggleRow}>
                            <View style={styles.toggleLabelWrap}>
                              <Text style={styles.toggleLabel}>Keep scanning</Text>
                              <Text style={styles.toggleHint}>Reopen the scanner after you add</Text>
                            </View>
                            <Toggle
                              value={keepScanning}
                              onValueChange={onKeepScanning ?? (() => {})}
                              testID="toggle-keep-scanning"
                            />
                          </View>
                        </>
                      )}
                    </View>
```
with:
```tsx
                      {scanned && (
                        <>
                          {(showSaveToggle || isManual) && <View style={styles.toggleDivider} />}
                          <View style={styles.toggleRow}>
                            <View style={styles.toggleLabelWrap}>
                              <Text style={styles.toggleLabel}>Keep scanning</Text>
                              <Text style={styles.toggleHint}>Reopen the scanner after you add</Text>
                            </View>
                            <Toggle
                              value={keepScanning}
                              onValueChange={onKeepScanning ?? (() => {})}
                              testID="toggle-keep-scanning"
                            />
                          </View>
                        </>
                      )}
                    </View>
                    )}
```

### Step 4: Run, expect PASS

Run: `npx jest __tests__/AddItemSheet.test.tsx`
Expected: all pass. `npx tsc --noEmit` clean. Full `npx jest` for regressions.

### Step 5: Commit

```bash
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: Save to My Foods only shown for new or edited items"
```

---

## Task 3: Summary/Edit split for search-picked foods

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (`pick()`; `showEditButton`; the product-summary block `:581-627`; the manual-picked serving-pill block `:644-698`)
- Test: `__tests__/AddItemSheet.test.tsx`

### What changes
Today, a scanned/found product opens as a read-only summary with an **Edit** button; a search-picked suggestion (manual mode) instead opens directly into editable fields. This task brings search-picked foods onto the same summary-then-Edit pattern:
- `pick()` resets `editing` to `false`, so a fresh pick always opens in Summary.
- `showEditButton` extends to cover `isManual && pickedSuggestion && !editing`.
- The product-summary card extends to render for a picked suggestion too (not just a scanned product), and gains a "weight per pack" line (it previously showed only kcal/100g, never the weight).
- The two near-duplicate serving-pill blocks (one for the read-only view, one for "manual after a pick") are consolidated into a single block that only renders in Edit — so switching a serving size, or typing a custom weight, is only possible after tapping Edit, matching the "make it clear things are editable via an Edit button" ask.

### Step 1: Write the failing tests

Replace the existing `'autofills name + kcal from a tapped local suggestion'` test (it currently expects editable fields immediately after picking, with no Edit step — that's the old behavior this task changes) with:
```tsx
  it('shows a summary with an Edit button after picking a suggestion, then reveals editable fields', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    // Summary first: no editable weight field yet, but an Edit button is present.
    expect(queryByTestId('weight-input')).toBeNull()
    expect(getByTestId('edit-product-button')).toBeTruthy()
    fireEvent.press(getByTestId('edit-product-button'))
    expect(queryByTestId('edit-product-button')).toBeNull() // hides once editing
    // Banana ships a "per banana" serving, so it opens on that unit pill;
    // switch to Custom (g) to enter an arbitrary weight.
    fireEvent.press(getByText('Custom (g)'))
    fireEvent.changeText(getByTestId('weight-input'), '120')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Banana', weightG: 120, kcal: 107, quantity: 1, source: 'manual',
      }),
      { save: true } // fully custom weight change makes it dirty -> saved
    )
  })
```

Replace `'prefills macros from a tapped suggestion and shows them editable'` with:
```tsx
  it('prefills macros from a tapped suggestion, editable after tapping Edit', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    fireEvent.press(getByTestId('edit-product-button'))
    fireEvent.press(getByText('Custom (g)'))
    expect(getByTestId('nf-protein').props.value).not.toBe('')
  })
```

Add a new test for the summary's weight-per-pack line:
```tsx
  it('shows the weight per pack in the summary before editing', async () => {
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    expect(getByText(/per pack/)).toBeTruthy()
  })
```

### Step 2: Run, expect FAIL

Run: `npx jest __tests__/AddItemSheet.test.tsx -t "shows a summary with an Edit button"`
Expected: FAIL — today, picking a suggestion goes straight to editable fields; there is no `edit-product-button` for a manual pick, and `weight-input` is present immediately (not `null`).

### Step 3: Implement

In `pick()`, add `setEditing(false)` right after `setPickedSuggestion(true)`:
```ts
    setPickedSuggestion(true)
    setEditing(false)
    const srvs = s.servings ?? []
```

Extend `showEditButton` (set in Task 1, currently `const showEditButton = scanned && !isManual && !editing`):
```ts
  const showEditButton = (scanned && !isManual && !editing) || (isManual && pickedSuggestion && !editing)
```

Extend the product-summary block (lines 581-600) to also render for a picked manual suggestion, and add a weight-per-pack line. Replace:
```tsx
                  {/* ── 5. SCANNED PRODUCT SUMMARY (read-only default view) ── */}
                  {!isManual && !editing && (
                    <View style={styles.productSummary}>
                      <View style={styles.productAv}>
                        <Text style={styles.productEmoji}>{emoji}</Text>
                      </View>
                      <View style={styles.productTx}>
                        <Text style={styles.productName}>{name}</Text>
                        {kcalPer100g != null && (
                          <Text style={styles.productMeta}>{kcalPer100g} kcal / 100g</Text>
                        )}
                      </View>
                      <View>
                        <Text style={styles.productKcal}>
                          {perUnitKcal > 0 ? formatEnergy(perUnitKcal, units) : ''}
                        </Text>
                        <Text style={styles.productKcalSmall}>KCAL</Text>
                      </View>
                    </View>
                  )}
```
with:
```tsx
                  {/* ── 5. FOOD SUMMARY (read-only default view — scanned, or a picked suggestion) ── */}
                  {((!isManual || pickedSuggestion) && !editing) && (
                    <View style={styles.productSummary}>
                      <View style={styles.productAv}>
                        <Text style={styles.productEmoji}>{emoji}</Text>
                      </View>
                      <View style={styles.productTx}>
                        <Text style={styles.productName}>{name}</Text>
                        <Text style={styles.productMeta}>
                          {weightNum > 0 ? `${weightToDisplay(weight)} ${isOz ? 'oz' : 'g'} per pack` : ''}
                          {weightNum > 0 && kcalPer100g != null ? '  ·  ' : ''}
                          {kcalPer100g != null ? `${kcalPer100g} kcal/100g` : ''}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.productKcal}>
                          {perUnitKcal > 0 ? formatEnergy(perUnitKcal, units) : ''}
                        </Text>
                        <Text style={styles.productKcalSmall}>KCAL</Text>
                      </View>
                    </View>
                  )}
```

Now consolidate the two serving-pill blocks. Delete the "read-only view" unit picker entirely (lines 602-627):
```tsx
                  {/* ── 5b-unit. UNIT PICKER (scanned read-only view, when servings available) ── */}
                  {!isManual && !editing && servings.length > 0 && (
                    <View style={styles.unitRow}>
                      {servings.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.unitPill, servingIdx === i && styles.unitPillActive]}
                          onPress={() => { setServingIdx(i); setWeight(String(s.weightG)) }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.unitPillText, servingIdx === i && styles.unitPillTextActive]}>
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[styles.unitPill, servingIdx === null && styles.unitPillActive]}
                        onPress={() => setServingIdx(null)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.unitPillText, servingIdx === null && styles.unitPillTextActive]}>
                          Custom ({isOz ? 'oz' : 'g'})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

```
(delete this whole block, including its blank trailing line — the next block in the file is the "5b. EDIT FORM — Name" comment, which stays).

Then extend the remaining serving-pill block (currently gated only by `isManual && pickedSuggestion`, meaning it ignored `editing` entirely) to require `editing`. Replace:
```tsx
                  {/* ── WEIGHT input (manual after a pick) ── */}
                  {isManual && pickedSuggestion && (
                    <View style={styles.unitRow}>
```
with:
```tsx
                  {/* ── WEIGHT input (manual after a pick, once editing) ── */}
                  {isManual && pickedSuggestion && editing && (
                    <View style={styles.unitRow}>
```

And the weight-input text field's gate right below it — replace:
```tsx
                  {((isManual && pickedSuggestion && servingIdx === null) || (!isManual && editing)) && (
```
with:
```tsx
                  {editing && ((isManual && pickedSuggestion && servingIdx === null) || !isManual) && (
```

The `NutritionFields` block right after it is already gated by `((isManual && pickedSuggestion) || (!isManual && editing))` — tighten it to require `editing` for both branches too. Replace:
```tsx
                  {/* ── NUTRITION (manual after a pick, or found scan in edit mode) ── */}
                  {((isManual && pickedSuggestion) || (!isManual && editing)) && (
```
with:
```tsx
                  {/* ── NUTRITION (manual after a pick, or found scan — both once editing) ── */}
                  {editing && (isManual ? pickedSuggestion : true) && (
```

### Step 4: Run, expect PASS

Run: `npx jest __tests__/AddItemSheet.test.tsx`
Expected: all pass. `npx tsc --noEmit` clean. Full `npx jest` for regressions — pay particular attention to any `App.*.test.tsx` integration test that adds an item via search-pick-then-fill without an Edit tap; update it the same way (press `edit-product-button` after picking, before touching weight/nutrition fields).

### Step 5: Commit

```bash
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: summary + Edit button for search-picked foods, consolidate serving pills"
```

---

## Final verification
- [ ] `npx tsc --noEmit` clean; `npx jest` all green.
- [ ] On-device smoke (Fast Refresh): open Add manually — only search bar shows; type/pick a food and confirm Quantity/toggles/Add appear; pick a food from search and confirm it opens as a summary with Edit, and Save-to-My-Foods is hidden until you actually change something; scan a barcode and confirm the same Summary/Edit/dirty behavior; verify "Weight per pack" reads correctly in both g and oz (Settings → units).
- [ ] Confirm no orphan divider or empty toggle-group card renders in any state (visual check — not test-covered).

## Spec coverage
- Progressive disclosure (Search state) -> Task 1.
- "Weight per pack" label -> Task 1.
- Save-to-My-Foods only when new/edited -> Task 2.
- Summary -> Edit for picked/scanned foods (extended to search-picked) -> Task 3.
- "Link a barcode" available regardless of save state -> unchanged, already independent (verified in Task 2's toggle-group restructuring, which keeps the barcode block outside `showSaveToggle`'s own gate).
- Interaction with parked P3 branch (Scan label placement) -> no code here; noted in the design spec for whoever merges P3 later.
