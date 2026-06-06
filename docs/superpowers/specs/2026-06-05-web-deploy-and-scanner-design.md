# Web Deploy + In-Browser Barcode Scanner — Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

Let the user test in a real grocery store on their **iPhone over cellular**, with no Apple Developer account and no laptop, by shipping the app as a **web app on GitHub Pages** — including a **working barcode scanner in Safari**.

Two parts:
1. **Web barcode scanner.** The native `expo-camera` modern scanner is native-only and iOS Safari has no `BarcodeDetector`, so on web we scan with **`html5-qrcode`** (camera via `getUserMedia`, decodes EAN-13/EAN-8/UPC; falls back to zxing internally on Safari). Native scanning is unchanged.
2. **GitHub Pages deploy.** `expo export -p web` → static `dist/`, published to `https://annavotin.github.io/basket/` via a GitHub Actions workflow on every push to `main`. Repo is **public** (free Pages).

## Non-goals
- No change to the native scanner / Expo Go / EAS path.
- No PWA/offline-install, no service worker, no custom domain.
- No router — the app is a single screen; Pages serves one `index.html`.

---

## Scanner architecture (platform split, native untouched)

Downstream of "we have a barcode string" everything is shared: `lookupProductByBarcode` → `AddItemSheet`. Only the *capture* differs by platform.

**Platform-specific component resolution (Metro extensions):**
- `src/components/WebBarcodeScannerModal.tsx` — **native/default stub**: `export default function WebBarcodeScannerModal(_: Props) { return null }`. This is also what Jest and the native bundle see, so `html5-qrcode` (which touches `document`/`navigator`) never enters the native bundle or the jest graph.
- `src/components/WebBarcodeScannerModal.web.tsx` — **real web implementation** (Metro resolves `.web.tsx` for the web bundle only).

**Web implementation (`.web.tsx`):**
- Props: `{ visible: boolean; onScanned: (barcode: string) => void; onClose: () => void }`.
- Renders a full-screen `Modal` containing a `<View nativeID="web-barcode-reader" style={…} />` (react-native-web maps `nativeID` → DOM `id`) plus a Cancel button.
- On `visible` true: in a `useEffect`, `const scanner = new Html5Qrcode("web-barcode-reader")`, then
  `scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 280, height: 160 } }, (decodedText) => onScanned(decodedText), undefined)`.
  Restrict to retail 1D formats via `formatsToSupport: [EAN_13, EAN_8, UPC_A, UPC_E, CODE_128]` for speed.
- On close/unmount or after a successful scan: `scanner.stop()` then `scanner.clear()` (guarded in try/catch; stopping an already-stopped scanner throws).
- A one-shot guard so a single decode resolves once (stop before calling `onScanned`).
- No unit test (camera/DOM); the native stub keeps the jest graph clean. It must `tsc --noEmit` cleanly.

**`App.tsx` wiring:**
- Import `Platform` and `WebBarcodeScannerModal`.
- New state `const [webScannerVisible, setWebScannerVisible] = useState(false)`.
- `handleScanBarcode` branches:
  ```ts
  async function handleScanBarcode() {
    if (Platform.OS === 'web') { setWebScannerVisible(true); return }
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product); setSheetVisible(true)
  }
  async function handleWebBarcode(barcode: string) {
    setWebScannerVisible(false)
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product); setSheetVisible(true)
  }
  ```
- Render `<WebBarcodeScannerModal visible={webScannerVisible} onScanned={handleWebBarcode} onClose={() => setWebScannerVisible(false)} />` alongside the other modals. On native this is the null stub (harmless); `Platform.OS` is `'ios'` under jest so existing App tests are unaffected.

**Dependency:** add `html5-qrcode` (`npx expo install html5-qrcode` or `npm i html5-qrcode`). Imported only from `.web.tsx`, so it lands only in the web bundle.

**OFF User-Agent on web:** browsers forbid setting the `User-Agent` request header; `foodApi.ts` sets it. The browser silently drops it and reads still succeed, but to avoid noise, only attach the header off-web: `const headers = Platform.OS === 'web' ? {} : { 'User-Agent': OFF_USER_AGENT }`. (Keeps the existing native behavior and the existing foodApi tests green — the tests assert the header on the native/default path.)

---

## Deploy (GitHub Pages via Actions)

1. **`app.json`:** add `"experiments": { "baseUrl": "/basket" }` under `expo`, so exported asset URLs resolve under the project-page subpath `https://annavotin.github.io/basket/`.
2. **Repo:** create public `annavotin/basket` and push `main` (`gh repo create basket --public --source=. --remote=origin --push`).
3. **Workflow** `.github/workflows/deploy-web.yml` — on push to `main`:
   - `actions/checkout`, `actions/setup-node` (Node 20), `npm ci`
   - `npx expo export -p web` (outputs `dist/`)
   - `actions/configure-pages` with `enablement: true` (auto-turns on Pages, source = Actions)
   - `actions/upload-pages-artifact` with `path: dist`
   - `actions/deploy-pages`
   - Correct `permissions` (`pages: write`, `id-token: write`, `contents: read`) and a `github-pages` environment.
4. HTTPS is provided by Pages (Safari requires it for camera). ✓
5. AsyncStorage uses `localStorage` on web automatically — persistence works.

---

## Testing & verification
- Existing jest suite stays green (native stub + `Platform.OS==='web'` branch is not exercised under jest). `foodApi` tests still pass (UA header attached on the default/native path).
- `npx tsc --noEmit` clean (both `WebBarcodeScannerModal` variants type-check).
- `npx expo export -p web --output-dir /tmp/web-check` succeeds and emits `index.html` + assets referencing `/basket/…`.
- Never run `npx expo start`.
- **Real-world check (human, on iPhone):** open the Pages URL in Safari, allow camera, scan a grocery barcode → product sheet appears; manual add + extras also work. The native build path is unchanged.

## Risks / notes
- iOS Safari camera needs a user gesture + HTTPS; the scan button tap satisfies the gesture, Pages provides HTTPS.
- `html5-qrcode` 1D decoding on Safari uses its zxing fallback — slightly slower than native but functional.
- First Pages deploy can take a minute to go live; the workflow URL shows status.
