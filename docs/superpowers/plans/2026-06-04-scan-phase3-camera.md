# Scan — Phase 3 (Real Camera Barcode + Open Food Facts) Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD. Steps use checkbox (`- [ ]`) syntax. Spec: `docs/superpowers/specs/2026-06-04-scan-buttons-design.md`. Builds on Phase 1/2 (simulated scanning).

**Goal:** Replace the **simulated** barcode scan (photo-pick → random mock product) with the **real thing**: a live `expo-camera` scanner that reads a product barcode, looks it up in **Open Food Facts**, and feeds the result into the existing confirm sheet (`AddItemSheet`). Not-found / no-nutrition falls back to manual entry. Receipt scanning stays simulated (its real OCR is a separate future effort).

**Architecture:** Two new pieces. (1) `src/services/foodApi.ts` — a pure, injectable-`fetch` Open Food Facts client (`lookupProductByBarcode`) that returns our existing `Product` type or `null`; fully unit-tested with a mocked fetch (no network). (2) `src/components/BarcodeScannerModal.tsx` — a full-screen `expo-camera` scanner (permission, live preview, debounced detection, loading state) that calls the lookup service and reports the result. `App.tsx`: `handleScanBarcode` opens the scanner instead of the picker; on a resolved product it opens `AddItemSheet` (package-size default), on not-found it opens `AddItemSheet` in manual mode. The camera component is kept out of the jest graph (no test imports it); the network logic is tested via the service.

**Tech Stack:** Expo SDK 54, React Native, `expo-camera` (new dep — works in Expo Go on a physical device), Open Food Facts v2 API, Jest.

**Research notes baked into this plan:**
- OFF production endpoint: `https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=product_name,brands,product_quantity,nutriments` (`.net` is staging — do not use).
- OFF **requires a custom `User-Agent`** (`AppName/Version (contact)`); reads need no auth. Use a placeholder contact, NOT a personal email.
- Calories: `nutriments["energy-kcal_100g"]`. Package grams: `product_quantity`. Both may be missing → treat as not-found → manual.
- `onBarcodeScanned` fires repeatedly → guard with an "already-scanned" flag so we only handle one.
- Camera works in Expo Go on a **real device** only (not web/simulator).

---

## Scope / YAGNI

**In scope:** live camera barcode scan, OFF lookup + parse, wire into the existing confirm/manual sheet, camera-permission handling, not-found fallback, scan debounce.

**Out of scope (do NOT build):** receipt OCR (stays simulated), caching, offline DB, macros parsing/display, multi-result disambiguation, USDA/secondary sources. Keep the simulated receipt path exactly as-is.

---

## Task 1: Install expo-camera

**Files:** `package.json`, possibly `app.json`

- [ ] **Step 1:** `cd "/Users/annavotin/personal/coding proj/basket" && npx expo install expo-camera`
- [ ] **Step 2:** If `npx expo install` printed config-plugin guidance, add the camera permission string to `app.json` under `expo.plugins` (only if a `plugins` array is conventional for this project; otherwise skip — Expo Go provides the permission prompt in dev). Example to add if a plugins array exists:
```json
["expo-camera", { "cameraPermission": "Allow Basket to scan product barcodes." }]
```
Do not invent an `app.json` structure that breaks `npx expo export`; if unsure, skip this step (dev in Expo Go works without it).
- [ ] **Step 3:** `npx jest` — existing 53 tests still pass (no test imports the camera).
- [ ] **Step 4: Commit:**
```bash
git add package.json package-lock.json app.json
git commit -m "chore: add expo-camera for barcode scanning"
```

---

## Task 2: Open Food Facts client (TDD, mocked fetch)

**Files:**
- Create: `src/services/foodApi.ts`
- Create: `__tests__/foodApi.test.ts`

`lookupProductByBarcode(barcode, deps?)` returns a `Product` (`{ name, emoji, packageWeightG, kcalPer100g }`) or `null`. `deps.fetch` is injectable so tests never hit the network. Robust to missing fields / not-found / network errors (all → `null`).

- [ ] **Step 1: Failing tests** `__tests__/foodApi.test.ts`:
```ts
import { lookupProductByBarcode, OFF_USER_AGENT } from '../src/services/foodApi'

function fakeFetch(payload: any, ok = true) {
  return jest.fn(async (_url: string, _opts?: any) => ({
    ok,
    json: async () => payload,
  })) as unknown as typeof fetch
}

describe('lookupProductByBarcode', () => {
  it('requests the production OFF v2 endpoint with a User-Agent', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'X', product_quantity: '100', nutriments: { 'energy-kcal_100g': 50 } },
    })
    await lookupProductByBarcode('3017624010701', { fetch: fetchMock })
    const [url, opts] = (fetchMock as jest.Mock).mock.calls[0]
    expect(url).toContain('https://world.openfoodfacts.org/api/v2/product/3017624010701')
    expect(url).toContain('fields=')
    expect(opts.headers['User-Agent']).toBe(OFF_USER_AGENT)
  })

  it('maps a found product to a Product (package size + kcal/100g)', async () => {
    const fetchMock = fakeFetch({
      product: {
        product_name: 'Nutella',
        brands: 'Ferrero',
        product_quantity: '400',
        nutriments: { 'energy-kcal_100g': 539 },
      },
    })
    const product = await lookupProductByBarcode('3017624010701', { fetch: fetchMock })
    expect(product).toEqual({
      name: 'Nutella',
      emoji: '🛒',
      packageWeightG: 400,
      kcalPer100g: 539,
    })
  })

  it('returns null when the product is missing', async () => {
    const fetchMock = fakeFetch({ status: 0 })
    expect(await lookupProductByBarcode('0000', { fetch: fetchMock })).toBeNull()
  })

  it('returns null when there is no usable energy value', async () => {
    const fetchMock = fakeFetch({ product: { product_name: 'Mystery', nutriments: {} } })
    expect(await lookupProductByBarcode('0000', { fetch: fetchMock })).toBeNull()
  })

  it('falls back to a default package weight when product_quantity is absent', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'Loose', nutriments: { 'energy-kcal_100g': 100 } },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ name: 'Loose', packageWeightG: 100, kcalPer100g: 100 })
  })

  it('returns null on a network/parse error', async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await lookupProductByBarcode('1', { fetch: fetchMock })).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** `src/services/foodApi.ts`:
```ts
import { Product } from '../mockProducts'

export const OFF_USER_AGENT = 'basket-mealprep/1.0 (contact@example.com)'

const FIELDS = 'product_name,brands,product_quantity,nutriments'
const BASE = 'https://world.openfoodfacts.org/api/v2/product'

const DEFAULT_PACKAGE_G = 100

type Deps = { fetch: typeof fetch }

export async function lookupProductByBarcode(
  barcode: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<Product | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(barcode)}?fields=${FIELDS}`
    const res = await deps.fetch(url, { headers: { 'User-Agent': OFF_USER_AGENT } })
    if (!res.ok) return null
    const json: any = await res.json()
    const p = json?.product
    if (!p) return null

    const kcalPer100g = p.nutriments?.['energy-kcal_100g']
    if (typeof kcalPer100g !== 'number' || kcalPer100g <= 0) return null

    const qty = parseFloat(p.product_quantity)
    const packageWeightG = Number.isFinite(qty) && qty > 0 ? Math.round(qty) : DEFAULT_PACKAGE_G

    const name =
      typeof p.product_name === 'string' && p.product_name.trim()
        ? p.product_name.trim()
        : `Product ${barcode}`

    return { name, emoji: '🛒', packageWeightG, kcalPer100g }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run, verify all pass. Commit:**
```bash
git add src/services/foodApi.ts __tests__/foodApi.test.ts
git commit -m "feat: add Open Food Facts barcode lookup client"
```

---

## Task 3: BarcodeScannerModal (expo-camera, no unit test)

**Files:**
- Create: `src/components/BarcodeScannerModal.tsx`

No unit test (keeps `expo-camera` out of the jest graph; verified on a physical device). It must `tsc --noEmit` cleanly.

Behaviour: when `visible`, request camera permission, show the live camera, detect a barcode once (guarded), show a brief "Looking up…" state while it calls `lookupProductByBarcode`, then call `onResult(product, barcode)` (product may be `null` for not-found). A Cancel button calls `onClose`.

- [ ] **Step 1: Implement** `src/components/BarcodeScannerModal.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Product } from '../mockProducts'
import { lookupProductByBarcode } from '../services/foodApi'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  onResult: (product: Product | null, barcode: string) => void
  onClose: () => void
}

export default function BarcodeScannerModal({ visible, onResult, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const [looking, setLooking] = useState(false)
  const handledRef = useRef(false)

  // Reset the one-shot guard each time the scanner opens.
  useEffect(() => {
    if (visible) {
      handledRef.current = false
      setLooking(false)
    }
  }, [visible])

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission()
    }
  }, [visible, permission])

  async function handleScanned(barcode: string) {
    if (handledRef.current) return
    handledRef.current = true
    setLooking(true)
    const product = await lookupProductByBarcode(barcode)
    onResult(product, barcode)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        {permission?.granted ? (
          <CameraView
            style={styles.fill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => handleScanned(data)}
          >
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>
                {looking ? 'Looking up…' : 'Point at a barcode'}
              </Text>
              {looking && <ActivityIndicator color="#FFFFFF" style={{ marginTop: 12 }} />}
            </View>
          </CameraView>
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              Camera access is needed to scan barcodes.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240,
    height: 160,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 20 },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  permissionBtn: {
    backgroundColor: colors.cycleBar,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  cancel: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  cancelText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
})
```
> If the installed `expo-camera` version names props differently (e.g. requires `barcodeScannerEnabled`), adjust to that version's documented API so `onBarcodeScanned` fires. Keep `tsc --noEmit` clean.

- [ ] **Step 2: Type-check** `npx tsc --noEmit` — clean. Commit:
```bash
git add src/components/BarcodeScannerModal.tsx
git commit -m "feat: add live camera BarcodeScannerModal (expo-camera + OFF lookup)"
```

---

## Task 4: Wire the real scanner into App.tsx

**Files:** `App.tsx`

Replace the simulated barcode entry point with the camera scanner. Keep all receipt logic untouched. Remove the now-unused `simulateBarcodeScan` import (leave `simulateReceiptScan`).

- [ ] **Step 1: Apply to `App.tsx`:**

1. Imports:
   - Add `import BarcodeScannerModal from './src/components/BarcodeScannerModal'`.
   - Change the scan-service import from `{ simulateBarcodeScan, simulateReceiptScan }` to just `{ simulateReceiptScan }`.
   - `Product` is already imported.

2. Add scanner state near the other `useState`s:
```tsx
  const [scannerVisible, setScannerVisible] = useState(false)
```

3. Replace `handleScanBarcode` so it opens the scanner instead of the picker:
```tsx
  function handleScanBarcode() {
    setScannerVisible(true)
  }

  function handleScannerResult(product: Product | null, _barcode: string) {
    setScannerVisible(false)
    setSheetProduct(product) // null -> AddItemSheet opens in manual mode
    setSheetVisible(true)
  }
```
(`handleScanBarcode` is now synchronous; the `onScanBarcode` props on `NewPeriodPanel`/`AddFab` accept `() => void`, so this is fine.)

4. Render the scanner modal alongside the other modals (near `<AddItemSheet />` / `<ReceiptReviewSheet />`):
```tsx
        <BarcodeScannerModal
          visible={scannerVisible}
          onResult={handleScannerResult}
          onClose={() => setScannerVisible(false)}
        />
```

5. Leave `handleScanReceipt`, `simulateReceiptScan`, `ReceiptReviewSheet`, `AddItemSheet`, budget bar, FAB, etc. exactly as they are.

- [ ] **Step 2: Type-check + full suite:**
```bash
npx tsc --noEmit
npx jest
```
Expect: tsc clean; all pass. Count = 53 (Phase 2) + foodApi 6 = **59**.

- [ ] **Step 3: Bundle verification (NEVER run `expo start`):**
```bash
npx expo export --platform ios --output-dir /tmp/cam-ios
npx expo export --platform web --output-dir /tmp/cam-web
rm -rf /tmp/cam-ios /tmp/cam-web
```
Expect both to bundle cleanly. (The camera only *runs* on a real device, but it must still bundle for web/ios.)

- [ ] **Step 4: Commit:**
```bash
git add App.tsx
git commit -m "feat: open live camera barcode scanner from the scan buttons"
```

---

## Verification checklist (executor self-review)

- [ ] `npx tsc --noEmit` clean
- [ ] `npx jest` — **59 tests** pass (added: foodApi ×6)
- [ ] `npx expo export` succeeds for ios AND web
- [ ] **No `expo start`** or watch/long-running command was run
- [ ] `simulateBarcodeScan` is no longer imported by `App.tsx`; receipt flow untouched (still simulated)
- [ ] `OFF_USER_AGENT` uses a placeholder contact, not a personal email
- [ ] Camera component is NOT imported by any test file (expo-camera stays out of the jest graph)

**Device note for the human (not the executor):** the live camera + barcode scan can only be verified on a physical phone via Expo Go (`npx expo start`, scan the QR with the phone). Web preview and simulators won't open a working camera. Not-found barcodes (or products lacking calorie data in Open Food Facts) intentionally drop into manual entry.

**Do NOT run `npx expo start` — it hangs. Use `expo export` for bundle checks.**
