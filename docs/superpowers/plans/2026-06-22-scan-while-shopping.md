# Scan-While-Shopping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make barcode scanning a fast shop-as-you-go loop: scan → confirm/edit in the layover → Save, with a visible "Remember this item" toggle (replaces today's silent auto-save) and a sticky "Keep scanning" toggle that reopens the scanner after each add.

**Architecture:** Reuse `AddItemSheet` as the layover (Approach A — orchestrate in `App.tsx`). Add two reusable `Toggle` rows to the sheet, gated to scan-opened sheets. Persist `keepScanning` in AsyncStorage; keep `onAdd`'s signature unchanged by making both toggle values **controlled props owned by `App`**, so `App.handleAddItem` reads them directly to decide the save and the re-scan.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, AsyncStorage, Jest + @testing-library/react-native. Reuses existing `src/components/settings/Toggle.tsx`.

---

## File Structure

- `src/services/storage.ts` — add `keepScanning` load/save helpers (mirrors `loadDailyGoal`/`saveDailyGoal`).
- `__tests__/storage-keepScanning.test.ts` — **new**, unit-tests the persistence helpers.
- `src/components/AddItemSheet.tsx` — add 5 optional props + two `Toggle` rows rendered only when `scanned`.
- `__tests__/AddItemSheet.test.tsx` — add a `scan toggles` describe block.
- `App.tsx` — `keepScanning` + `saveForLater` state, load/persist `keepScanning`, reset `saveForLater` on open, pass props to `AddItemSheet`, gate the save and drive the re-scan loop in `handleAddItem`.

No new components or services — `Toggle` already exists and the lookup/preload/save plumbing already exists.

---

## Task 1: Persist `keepScanning`

**Files:**
- Modify: `src/services/storage.ts` (after `saveDailyGoal`, ~line 106)
- Test: `__tests__/storage-keepScanning.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `__tests__/storage-keepScanning.test.ts`:

```ts
import { loadKeepScanning, saveKeepScanning, STORAGE_KEY_KEEP_SCANNING } from '../src/services/storage'

function mockStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v }),
    removeItem: jest.fn(async (k: string) => { delete store[k] }),
  }
}

describe('keepScanning persistence', () => {
  it('defaults to false when unset', async () => {
    const storage = mockStorage()
    expect(await loadKeepScanning({ storage })).toBe(false)
  })

  it('round-trips true', async () => {
    const storage = mockStorage()
    await saveKeepScanning(true, { storage })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY_KEEP_SCANNING, 'true')
    expect(await loadKeepScanning({ storage })).toBe(true)
  })

  it('returns false on malformed json', async () => {
    const storage = mockStorage({ [STORAGE_KEY_KEEP_SCANNING]: '{bad' })
    expect(await loadKeepScanning({ storage })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest storage-keepScanning`
Expected: FAIL — `loadKeepScanning`/`saveKeepScanning`/`STORAGE_KEY_KEEP_SCANNING` are not exported.

- [ ] **Step 3: Add the helpers**

In `src/services/storage.ts`, immediately after `saveDailyGoal` (currently ends ~line 106), add:

```ts
export const STORAGE_KEY_KEEP_SCANNING = 'basket:keepScanning:v1'

export async function loadKeepScanning(deps: StorageDeps = defaultDeps): Promise<boolean> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_KEEP_SCANNING)
    return raw != null && JSON.parse(raw) === true
  } catch { return false }
}

export async function saveKeepScanning(on: boolean, deps: StorageDeps = defaultDeps): Promise<void> {
  try { await deps.storage.setItem(STORAGE_KEY_KEEP_SCANNING, JSON.stringify(on)) } catch {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest storage-keepScanning`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/storage.ts __tests__/storage-keepScanning.test.ts
git commit -m "feat: persist keep-scanning preference"
```

---

## Task 2: `AddItemSheet` toggle rows

**Files:**
- Modify: `src/components/AddItemSheet.tsx` (Props ~18-26, destructure ~28, styles ~228, render above Add button ~521)
- Test: `__tests__/AddItemSheet.test.tsx` (append a describe block)

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/AddItemSheet.test.tsx`:

```tsx
describe('AddItemSheet — scan toggles', () => {
  const scanned: Product = { name: 'Oatly', emoji: '🥛', packageWeightG: 1000, kcalPer100g: 61 }

  it('shows Remember + Keep-scanning toggles in scanned mode', () => {
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} />
    )
    expect(getByTestId('toggle-remember')).toBeTruthy()
    expect(getByTestId('toggle-keep-scanning')).toBeTruthy()
  })

  it('hides the toggles when not opened from a scan', () => {
    const { queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={() => {}} onClose={() => {}} />
    )
    expect(queryByTestId('toggle-remember')).toBeNull()
    expect(queryByTestId('toggle-keep-scanning')).toBeNull()
  })

  it('reports toggle changes to the parent', () => {
    const onSaveForLater = jest.fn()
    const onKeepScanning = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet
        visible product={scanned} scanned
        saveForLater onSaveForLater={onSaveForLater}
        keepScanning={false} onKeepScanning={onKeepScanning}
        onAdd={() => {}} onClose={() => {}}
      />
    )
    fireEvent.press(getByTestId('toggle-remember'))      // true -> false
    expect(onSaveForLater).toHaveBeenCalledWith(false)
    fireEvent.press(getByTestId('toggle-keep-scanning'))  // false -> true
    expect(onKeepScanning).toHaveBeenCalledWith(true)
  })

  it('still emits the item on Add with toggles present', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} />
    )
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly', source: 'barcode' }))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest AddItemSheet -t "scan toggles"`
Expected: FAIL — `toggle-remember` / `toggle-keep-scanning` not found.

- [ ] **Step 3: Add the import**

In `src/components/AddItemSheet.tsx`, under the existing `import Stepper from './settings/Stepper'` (line 7) add:

```tsx
import Toggle from './settings/Toggle'
```

- [ ] **Step 4: Extend the Props type**

Replace the `Props` type (lines 18-26) with:

```tsx
type Props = {
  visible: boolean
  product: Product | null
  onAdd: (item: FoodItem) => void
  onClose: () => void
  onScanBarcode?: () => void
  onScanReceipt?: () => void
  customFoods?: CustomFood[]
  scanned?: boolean
  saveForLater?: boolean
  onSaveForLater?: (next: boolean) => void
  keepScanning?: boolean
  onKeepScanning?: (next: boolean) => void
}
```

- [ ] **Step 5: Destructure the new props**

Replace the function signature (line 28) with:

```tsx
export default function AddItemSheet({ visible, product, onAdd, onClose, onScanBarcode, onScanReceipt, customFoods = [], scanned = false, saveForLater = true, onSaveForLater, keepScanning = false, onKeepScanning }: Props) {
```

- [ ] **Step 6: Add styles**

In the `StyleSheet.create({ ... })` block, just before the `// ── Add button ──` group (line ~228), add:

```tsx
    // ── Scan toggles (scanned mode only) ──────────────────────────────────────
    toggleGroup: {
      backgroundColor: colors.white, borderRadius: 16,
      paddingHorizontal: 14, marginTop: 8, marginBottom: 4,
      shadowColor: colors.forest, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12,
    },
    toggleLabelWrap: { flex: 1, paddingRight: 12 },
    toggleLabel: {
      fontFamily: fonts.display, fontSize: 15, color: colors.forest, fontWeight: '600',
    },
    toggleHint: {
      fontFamily: fonts.display, fontSize: 12, color: colors.mossFaint, marginTop: 2,
    },
    toggleDivider: { height: 1, backgroundColor: colors.line },
```

- [ ] **Step 7: Render the toggle rows above the Add button**

In the render, immediately before the `{/* ── ADD BUTTON ── */}` block (line ~521), insert:

```tsx
                {/* ── SCAN TOGGLES (scan-opened sheets only) ── */}
                {scanned && (
                  <View style={styles.toggleGroup}>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleLabelWrap}>
                        <Text style={styles.toggleLabel}>Remember this item</Text>
                        <Text style={styles.toggleHint}>Preload it next time you scan this barcode</Text>
                      </View>
                      <Toggle
                        value={saveForLater}
                        onValueChange={onSaveForLater ?? (() => {})}
                        testID="toggle-remember"
                      />
                    </View>
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
                  </View>
                )}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx jest AddItemSheet`
Expected: PASS — the new `scan toggles` block plus all pre-existing `AddItemSheet` tests (the existing scanned/manual tests don't pass `scanned`, so they render no toggles and are unaffected).

- [ ] **Step 9: Commit**

```bash
git add src/components/AddItemSheet.tsx __tests__/AddItemSheet.test.tsx
git commit -m "feat: Remember + Keep-scanning toggles in the scan layover"
```

---

## Task 3: App wiring — state, persistence, save-gating, re-scan loop

**Files:**
- Modify: `App.tsx` (storage import ~52; state ~260; mount-load ~420; persist effect ~465; `handleScanBarcode` ~590; `handleAddItem` ~637; `AddItemSheet` props ~1017)

This task wires the toggles into the live app and drives the native re-scan loop. The camera/native scanner cannot run under jest, so this task is verified by (a) the full suite staying green, (b) `tsc` clean, and (c) an on-device check of the loop. No new unit tests — the testable logic (persistence, toggle reporting) is covered by Tasks 1–2.

- [ ] **Step 1: Import the persistence helpers**

In `App.tsx`, extend the storage import (line 52) to include the two new helpers:

```tsx
import { loadCycles, saveCycles, loadExtras, saveExtras, loadDailyGoal, saveDailyGoal, loadPantry, savePantry, loadPrefs, savePrefs, exportAll, clearAll, loadCustomFoods, saveCustomFoods, loadKeepScanning, saveKeepScanning } from './src/services/storage'
```

- [ ] **Step 2: Add state**

After `const [scanBarcode, setScanBarcode] = useState<string | null>(null)` (line 260), add:

```tsx
  const [keepScanning, setKeepScanning] = useState(false)
  const [saveForLater, setSaveForLater] = useState(true)
```

- [ ] **Step 3: Load `keepScanning` on mount**

In the effect that calls `loadDailyGoal()` (line ~420), add a sibling load. The effect already guards with a `cancelled` flag; add:

```tsx
    loadKeepScanning().then((v) => {
      if (!cancelled) setKeepScanning(v)
    })
```

(Place it next to the existing `loadDailyGoal().then(...)` call inside the same effect.)

- [ ] **Step 4: Persist `keepScanning` on change**

Next to the `saveDailyGoal` persist effect (lines 464-466), add a matching effect:

```tsx
  useEffect(() => {
    if (hydrated) saveKeepScanning(keepScanning)
  }, [keepScanning, hydrated])
```

- [ ] **Step 5: Reset `saveForLater` to ON each scan**

In `handleScanBarcode`, right after `setScanBarcode(barcode)` (line 592), add:

```tsx
    setSaveForLater(true)
```

- [ ] **Step 6: Gate the save and drive the re-scan loop**

Replace `handleAddItem` (lines 637-644) with:

```tsx
  function handleAddItem(item: FoodItem) {
    const wasScanned = scanBarcode != null
    handleAddItems([item])
    // Manual adds always save (today's behavior); scanned adds respect the "Remember" toggle.
    if (!wasScanned || saveForLater) {
      const food = customFoodFromItem(item, scanBarcode ?? undefined)
      if (food) setCustomFoods((prev) => upsertCustomFood(prev, food))
    }
    setScanBarcode(null)
    // Keep-scanning: the sheet closes right after this; wait for the modal to finish
    // dismissing before relaunching the native scanner, or iOS rejects the present
    // ("presentation in progress") — same teardown discipline as scan.ts.
    if (wasScanned && keepScanning) {
      setTimeout(() => { handleScanBarcode() }, 450)
    }
  }
```

- [ ] **Step 7: Pass the props to `AddItemSheet`**

Update the `<AddItemSheet ... />` element (lines 1017-1025) to add the five props:

```tsx
        <AddItemSheet
          visible={sheetVisible}
          product={sheetProduct}
          customFoods={customFoods}
          scanned={scanBarcode != null}
          saveForLater={saveForLater}
          onSaveForLater={setSaveForLater}
          keepScanning={keepScanning}
          onKeepScanning={setKeepScanning}
          onAdd={handleAddItem}
          onScanBarcode={() => { setSheetVisible(false); handleScanBarcode() }}
          onScanReceipt={() => { setSheetVisible(false); handleScanReceipt() }}
          onClose={() => { setSheetVisible(false); setScanBarcode(null) }}
        />
```

- [ ] **Step 8: Verify the suite + types**

Run: `npx jest`
Expected: PASS — all suites green (374 + Task 1's 3 + Task 2's 4 = 381).

Run: `npx tsc --noEmit 2>&1 | grep -E "App.tsx|AddItemSheet|storage.ts" || echo "clean"`
Expected: `clean` (no new errors in the touched files; pre-existing unrelated test-mock errors may remain).

- [ ] **Step 9: Commit**

```bash
git add App.tsx
git commit -m "feat: wire scan toggles + keep-scanning re-scan loop into App"
```

- [ ] **Step 10: On-device verification (cannot run in jest/simulator)**

Rebuild to the phone (`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device <id> --configuration Release`) and confirm:
1. Scan a barcode → layover shows **Remember this item** (ON) and **Keep scanning** (last value).
2. With **Keep scanning** OFF → Save closes the sheet, no rescan (today's behavior).
3. Turn **Keep scanning** ON → Save adds the item and the scanner reopens cleanly (no "presentation in progress" warning, no stuck sheet).
4. Kill + relaunch the app → **Keep scanning** is still ON (sticky).
5. Turn **Remember** OFF on a scan → Save adds it but it does NOT appear in My Foods / does not preload on a re-scan; with **Remember** ON it preloads next scan.
6. Close the layover with ✕ while looping → scanner does not reopen (loop ends).

---

## Self-Review

**Spec coverage:**
- Real scanner, layover = `AddItemSheet` scanned mode → reused, no new sheet ✓ (Task 2/3)
- "Remember this item" toggle, default ON, replaces always-on auto-save → ✓ (Task 2 render, Task 3 Step 6 gating)
- "Keep scanning" sticky, default OFF first time → ✓ (Task 1 persistence, Task 3 Steps 2-4)
- Save continues loop, ✕ ends it → ✓ (Task 3 Step 6: rescan only on add; close path unchanged)
- Toggles only on scan-opened sheets → ✓ (`scanned={scanBarcode != null}`, Task 3 Step 7)
- Manual `+` keeps always-save, no toggles → ✓ (Step 6 `!wasScanned || saveForLater`; `scanned` false for manual)
- Re-scan waits for modal dismissal → ✓ (Step 6 `setTimeout(..., 450)` with rationale)
- Not-found while looping (manual UI, Save continues) → ✓ (`scanned` is true on a not-found scan because `scanBarcode` is set; toggles render above Add in both layouts)

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** prop names `scanned` / `saveForLater` / `onSaveForLater` / `keepScanning` / `onKeepScanning` are identical across the Props type, the destructure, the render, and the `App` call site. `loadKeepScanning(): Promise<boolean>` / `saveKeepScanning(on: boolean)` match their uses. `onAdd` signature is unchanged, so existing `onAdd` assertions and call sites are untouched.
