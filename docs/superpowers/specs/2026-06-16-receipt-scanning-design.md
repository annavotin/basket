# Receipt Scanning (real OCR via Claude vision) — Design

**Date:** 2026-06-16

## Goal
Replace the stub `simulateReceiptScan` (which returns hardcoded mock lines) with a real
flow: photograph/pick a receipt → Claude Haiku vision extracts line items → review/edit in
the existing `ReceiptReviewSheet` → add to the cycle. The review sheet and add flow are
unchanged; only the extraction is real.

## Decisions (confirmed)
- **Model:** `claude-haiku-4-5` (cheap, fast, ~½–1¢/receipt; OCR + name normalization in one call).
- **Extraction:** full estimate per line — `{ name, weightG, kcal, isFood }`.
- **Hosting:** Supabase **Edge Function** proxy — the Anthropic key is a server-side secret,
  never in the app bundle.

## Architecture

### 1. Edge Function — `supabase/functions/scan-receipt/index.ts` (Deno)
- Reads the caller's Supabase auth (the function is invoked via `supabase.functions.invoke`,
  which forwards the user JWT); rejects unauthenticated callers.
- Calls Claude via the official SDK (`npm:@anthropic-ai/sdk`), model `claude-haiku-4-5`,
  with a vision message: the receipt image (base64) + a prompt, and a **structured-output
  JSON schema** so the reply is guaranteed-valid:
  `{ lines: [{ name: string, weightG: number, kcal: number, isFood: boolean }] }`.
- Prompt: extract each purchased item; **normalize** receipt shorthand ("CHKN THGH" →
  "Chicken thighs"); estimate `weightG` from the package size on the line or a typical size;
  estimate total `kcal`; set `isFood: false` for totals/tax/bags/deposits; skip blank lines.
- `ANTHROPIC_API_KEY` is a Supabase secret. CORS headers for the app origin.
- Returns `{ lines }` JSON (no DB writes — purely a vision proxy).

### 2. App
- `src/services/scan.ts` — `pickReceiptImage(): Promise<{ base64: string; mediaType: string } | null>`
  using `expo-image-picker` with `base64: true` (library pick; camera optional later).
- `src/services/receipt-extract.ts` (no native imports — testable):
  - `parseReceiptResponse(data: unknown): ReceiptLine[]` — maps/sanitizes the function's
    `{ lines }` into `ReceiptLine[]` (coerce numbers, default `isFood`, assign `newId()` ids,
    drop empty names). **Pure — this is what's unit-tested.**
  - `extractReceiptLines(image, invoke): Promise<ReceiptLine[]>` — calls `invoke(body)`
    (a thin wrapper over `supabase.functions.invoke('scan-receipt', …)`) then
    `parseReceiptResponse`. `invoke` is injected for testing.
- `App.handleScanReceipt` — `pickReceiptImage()` → `extractReceiptLines(...)` →
  `setReviewLines(...)` → open `ReceiptReviewSheet`. On null/error/offline/not-signed-in:
  surface a message and fall back to manual (current behavior). Replaces the
  `simulateReceiptScan` call.

### 3. Testing
- `parseReceiptResponse`: valid payload → mapped `ReceiptLine[]` with ids; coerces string
  numbers; defaults missing `isFood` to `true`; drops nameless rows; bad/empty input → `[]`.
- `extractReceiptLines`: calls the injected `invoke` with the image body and returns the
  parsed lines; invoke throwing → `[]` (offline-safe).
- The edge function (Deno) is not run under Jest; kept thin.

## User setup (one-time)
```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy scan-receipt
```
(Needs the Supabase CLI linked to the project. If `simulateReceiptScan` is still referenced
anywhere, it's removed.)

## Out of scope
- Custom camera framing UI, multi-receipt batching, auto-confirm (every line is still reviewed),
  ret​ailer-specific parsing.
