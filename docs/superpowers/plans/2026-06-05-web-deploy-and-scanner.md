# Web Deploy + In-Browser Barcode Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Ship the app as a public GitHub Pages web app the user can open on an iPhone over cellular, with a working Safari barcode scanner (html5-qrcode), without touching the native scan path.

**Architecture:** Platform-split scanner component (native null stub + `.web.tsx` html5-qrcode impl) so the web lib never enters the native bundle or jest graph; `App` branches on `Platform.OS` for capture and shares the downstream lookup→sheet flow. Deploy via `expo export -p web` + GitHub Actions → Pages, with `experiments.baseUrl: "/basket"`.

**Tech Stack:** Expo SDK 54, RN 0.81, react-native-web, html5-qrcode, GitHub Actions/Pages. Spec: `docs/superpowers/specs/2026-06-05-web-deploy-and-scanner-design.md`.

**Hard constraints:** `npx tsc --noEmit` clean and full `npx jest` green after every code task. NEVER run `npx expo start` — use `npx expo export -p web` for verification. The web scanner component has no unit test (camera/DOM) — the native stub keeps jest clean.

---

## Task 1: Guard the OFF User-Agent header off-web

**Files:** Modify `src/services/foodApi.ts`. Tests: existing `__tests__/foodApi.test.ts` must stay green (jest runs the native path, `Platform.OS==='ios'`, so the header is still attached).

- [ ] **Step 1:** Add `import { Platform } from 'react-native'` to `foodApi.ts`.
- [ ] **Step 2:** In BOTH `lookupProductByBarcode` and `searchProductsByName`, replace the inline `headers: { 'User-Agent': OFF_USER_AGENT }` with a computed value. Add near the top of the module:
```ts
const offHeaders: Record<string, string> =
  Platform.OS === 'web' ? {} : { 'User-Agent': OFF_USER_AGENT }
```
and use `deps.fetch(url, { headers: offHeaders })` in both functions.
- [ ] **Step 3:** Run `npx jest __tests__/foodApi.test.ts` — still green (header asserted on the native path). `npx tsc --noEmit` clean. Full `npx jest` green.
- [ ] **Step 4: Commit:**
```bash
git add src/services/foodApi.ts
git commit -m "fix: omit OFF User-Agent header on web (browsers forbid setting it)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: html5-qrcode dependency + WebBarcodeScannerModal (stub + web impl)

**Files:** `package.json` (+lock), Create `src/components/WebBarcodeScannerModal.tsx` (native stub) and `src/components/WebBarcodeScannerModal.web.tsx` (web impl).

- [ ] **Step 1:** Install: `npx expo install html5-qrcode` (falls back to `npm i html5-qrcode` if expo-install has no opinion). Confirm it lands in `package.json` dependencies.

- [ ] **Step 2:** Create the **native/default stub** `src/components/WebBarcodeScannerModal.tsx` (also what jest + native bundle use):
```tsx
// Native/jest stub. The real implementation is WebBarcodeScannerModal.web.tsx,
// which Metro resolves only for the web bundle. Keeping html5-qrcode out of the
// native bundle and the jest graph.
export type WebBarcodeScannerModalProps = {
  visible: boolean
  onScanned: (barcode: string) => void
  onClose: () => void
}

export default function WebBarcodeScannerModal(_props: WebBarcodeScannerModalProps) {
  return null
}
```

- [ ] **Step 3:** Create the **web impl** `src/components/WebBarcodeScannerModal.web.tsx`:
```tsx
import React, { useEffect, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { colors } from '../styles/colors'
import type { WebBarcodeScannerModalProps } from './WebBarcodeScannerModal'

const READER_ID = 'web-barcode-reader'
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
]

export default function WebBarcodeScannerModal({
  visible,
  onScanned,
  onClose,
}: WebBarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (!visible) return
    handledRef.current = false
    let cancelled = false

    // Defer so the <div id> from <View nativeID> is mounted in the DOM.
    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const scanner = new Html5Qrcode(READER_ID, { formatsToSupport: FORMATS, verbose: false })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (decodedText: string) => {
            if (handledRef.current) return
            handledRef.current = true
            onScanned(decodedText)
          },
          undefined
        )
      } catch {
        // Camera unavailable / permission denied — leave the modal; user can Cancel.
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
  }, [visible, onScanned])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        <View nativeID={READER_ID} style={styles.reader} />
        <Text style={styles.hint}>Point at a barcode</Text>
        <TouchableOpacity testID="web-scanner-cancel" style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  reader: { width: '100%', maxWidth: 480, aspectRatio: 1 },
  hint: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 16 },
  cancel: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28,
  },
  cancelText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
})
```
> If `html5-qrcode`'s types don't ship `Html5QrcodeSupportedFormats` as a value import, import it the way the installed version exposes it (it does export this enum). Keep `npx tsc --noEmit` clean. `colors` import is only for consistency; if unused after final styling, remove it to avoid an unused-import error.

- [ ] **Step 4:** `npx tsc --noEmit` clean (both variants type-check); full `npx jest` green (jest uses the stub; nothing imports the `.web` file in tests). 

- [ ] **Step 5: Commit:**
```bash
git add package.json package-lock.json src/components/WebBarcodeScannerModal.tsx src/components/WebBarcodeScannerModal.web.tsx
git commit -m "feat: add html5-qrcode web barcode scanner modal (web-only; native stub)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Wire the web scanner into App

**Files:** Modify `App.tsx`; Test: existing `__tests__/App.addToCycle.test.tsx` etc. stay green (jest path is native: `Platform.OS==='ios'`, stub renders null, web branch not taken).

Read `App.tsx` first. `handleScanBarcode` currently does the native scan → lookup → open sheet.

- [ ] **Step 1:** Add `Platform` to the `react-native` import; add `import WebBarcodeScannerModal from './src/components/WebBarcodeScannerModal'`.
- [ ] **Step 2:** Add state near the others: `const [webScannerVisible, setWebScannerVisible] = useState(false)`.
- [ ] **Step 3:** Replace `handleScanBarcode` and add `handleWebBarcode`:
```tsx
  async function handleScanBarcode() {
    if (Platform.OS === 'web') {
      setWebScannerVisible(true)
      return
    }
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product)
    setSheetVisible(true)
  }

  async function handleWebBarcode(barcode: string) {
    setWebScannerVisible(false)
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product)
    setSheetVisible(true)
  }
```
- [ ] **Step 4:** Render the modal next to the other modals (e.g. after `<AddItemSheet ... />`):
```tsx
        <WebBarcodeScannerModal
          visible={webScannerVisible}
          onScanned={handleWebBarcode}
          onClose={() => setWebScannerVisible(false)}
        />
```
- [ ] **Step 5:** `npx tsc --noEmit` clean; full `npx jest` green (App integration tests unaffected — native path). If timeouts appear under parallel load, re-run with `--runInBand`.
- [ ] **Step 6: Commit:**
```bash
git add App.tsx
git commit -m "feat: open the web barcode scanner from the scan button on web

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Deploy config (baseUrl + GitHub Actions workflow)

**Files:** Modify `app.json`; Create `.github/workflows/deploy-web.yml`.

- [ ] **Step 1:** In `app.json`, add under `"expo"`:
```json
    "experiments": { "baseUrl": "/basket" }
```
(Place it as a sibling of `"web"`; valid JSON, no trailing comma issues.)

- [ ] **Step 2:** Create `.github/workflows/deploy-web.yml`:
```yaml
name: Deploy web to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx expo export -p web
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Verify the web export builds locally with the baseUrl:**
```bash
npx expo export -p web --output-dir /tmp/web-check
```
Expect success and a `/tmp/web-check/index.html`. Confirm asset URLs are prefixed with `/basket/` (grep the index.html for `/basket/`). Then `rm -rf /tmp/web-check`.
`npx tsc --noEmit` clean; full `npx jest` green.

- [ ] **Step 4: Commit:**
```bash
git add app.json .github/workflows/deploy-web.yml
git commit -m "build: GitHub Pages web deploy workflow + /basket baseUrl

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Ops (controller, not a subagent task)
After Task 4: create the public repo, push, let the workflow deploy, and report the live URL.
```bash
gh repo create basket --public --source=. --remote=origin --push
```
Then poll `gh run list` / `gh run watch` for the `Deploy web` workflow; the live URL is `https://annavotin.github.io/basket/`. If Pages enablement via the workflow is blocked, enable it once in repo Settings → Pages (source: GitHub Actions) or via `gh api`.

## Final verification
- [ ] `npx tsc --noEmit` clean; full `npx jest` green (count unchanged — no new tests; web scanner untested by design)
- [ ] `npx expo export -p web` succeeds with `/basket/` asset prefix
- [ ] No `expo start`
- [ ] Native scan path unchanged; the `.web` scanner only affects the web bundle
- [ ] Human check on iPhone Safari at the live URL: scan a barcode → product sheet; manual add + extras work; data persists across reloads
```
