# AI calorie/macro estimate for manual Extras entry

## Problem

Adding an "extra meal" (`ExtraMealSheet.tsx`) requires the user to type a description and
manually guess calories. There's no macro capture at all today — `handleSaveExtra` in App.tsx
drops `macros` entirely, so extras always fall back to the kcal-derived 25/45/30 estimate
(`kcalDerivedMacros`) rather than a real per-item value.

## Goal

Let the user type a dish description (e.g. "large latte with oat milk", "burger and fries") and
get a Claude-estimated calorie + macro fill-in, editable before saving. Not a replacement for
manual entry — always optional, always overridable.

## Precedent this follows

`supabase/functions/scan-receipt/index.ts` already does the same shape of thing (Claude Haiku
4.5, server-side API key, JWT-gated) for receipt photos. This feature is the text-only sibling.

## Architecture

### New Edge Function: `supabase/functions/estimate-extra/index.ts`

- Same file structure/CORS/error-JSON helpers as `scan-receipt/index.ts`.
- Request: `{ description: string }`.
- Prompt: ask Claude for total (not per-100g) calories and protein/carbs/fat grams for the
  described dish/portion as eaten, tolerant of casual/compound descriptions ("burger and
  fries"). Model does **not** rewrite/clean the description — the user's typed name is used
  as-is for display; only the nutrition numbers come back.
- Response: `{ kcal: number, protein: number, carbs: number, fat: number }`. On any failure
  (missing key, bad JSON, network) return a `{ error }` JSON with non-200 status, same pattern
  as `scan-receipt`.
- Deploy: `supabase functions deploy estimate-extra`. Uses the existing `ANTHROPIC_API_KEY`
  secret (already required for `scan-receipt`) — no new secret.

### New client module: `src/services/extra-estimate.ts`

Mirrors `receipt-extract.ts`:
- `parseEstimateResponse(data: unknown): { kcal: number; protein: number; carbs: number; fat: number } | null` —
  pure, defensive (coerces numbers, `null` on missing/malformed fields, mirrors
  `parseReceiptResponse`'s sanitization style).
- `async function estimateExtra(description: string, invoke: Invoke): Promise<EstimateResult | null>` —
  calls `invoke({ description })`, parses the response, returns `null` on any thrown error.
  `invoke` is injected (wraps `supabase.functions.invoke('estimate-extra', { body })`) so this
  is unit-testable without a real network/Supabase client, same DI pattern as
  `extractReceiptLines`.

## UI changes — `src/components/ExtraMealSheet.tsx`

- New "Estimate with AI" button next to the Description field. Disabled until
  `name.trim().length > 0`.
- Button only renders when `isSupabaseConfigured` (matches the discoverability level of "Scan a
  receipt"/"Scan a barcode" elsewhere in the app).
- Tap behavior:
  - If not signed in (no active Supabase auth session): `Alert.alert('Sign in to use AI
    estimates', 'Create an account or sign in from Settings to use AI-estimated calories.')` —
    no network call made. (This directly addresses the silent-failure gap in today's
    receipt-scan flow when signed out; that existing gap is explicitly **not** being fixed as
    part of this feature — separate concern.)
  - Otherwise: set a local `estimating` boolean, show a spinner on the button (`ActivityIndicator`
    inline, replacing the button label) — **not** the app-level `loadingScrim`, since this call
    is entirely sheet-local and shouldn't block the rest of the screen.
  - On success: fill `kcal` (existing field) and reveal three new fields — Protein / Carbs / Fat,
    grams, always-total (no per-100g toggle — `NutritionFields` assumes a `weightG` that extra
    meals don't have, so this is a smaller, purpose-built set of three rows styled consistently
    with the app's existing input style, not a reuse of `NutritionFields`). All four fields
    remain manually editable after the fill.
  - On failure: `Alert.alert("Couldn't estimate that", 'Try a more specific description, or
    enter calories manually.')`. Existing manual kcal field (and now-visible macro fields, left
    blank) remain usable — there's always a manual fallback.
  - Re-tappable: editing the description and tapping "Estimate with AI" again re-fires and
    overwrites the fields (last estimate wins, no versioning/history).

## Data flow — App.tsx

- `ExtraMealSheet`'s `onSave` prop type changes from `(draft: { name: string; kcal: number })
  => void` to `(draft: { name: string; kcal: number; macros?: Macros }) => void`.
- `handleSaveExtra` (currently `touch({ id, date, name, kcal })`) passes `draft.macros` through:
  `touch({ id, date, name: draft.name, kcal: draft.kcal, macros: draft.macros })`.
- No changes to `handleSaveExtraPatch` (already accepts `macros?: Macros`, used by the existing
  edit-in-`ItemDetail` flow).
- `ExtraMealSheet` needs to know sign-in status *before* attempting the call (to show the
  sign-in alert without a network round-trip). New prop `signedIn: boolean`, passed from
  App.tsx as `signedIn={account != null}` — a derived boolean, not the raw `Account` object,
  keeping the sheet's prop surface minimal and easy to test.

## Error handling summary

| Failure | Behavior |
|---|---|
| Not signed in | Alert before any network call; no loading state shown |
| Supabase not configured | Button doesn't render |
| Network/API error | Alert after the call; fields stay as they were (empty or last estimate) |
| Malformed/partial Claude response | Treated as failure (same alert) — no partial fill of only some fields |

## Testing

- `__tests__/extra-estimate.test.ts` (new, mirrors `receipt-extract.test.ts`): malformed JSON,
  missing/non-numeric fields, network-throw → `null`, well-formed response → parsed values.
- `__tests__/ExtraMealSheet.test.tsx` (extend existing): button disabled with empty description,
  loading state during an in-flight estimate, success fills all four fields, failure shows the
  alert and leaves fields editable, signed-out tap shows the sign-in alert with no `invoke` call.
- `__tests__/App.syncMetadata.test.tsx` or a new `App`-level test: confirms `macros` from
  `handleSaveExtra` lands on the created `ExtraMeal` record.

## Explicitly out of scope

- Fixing the existing silent-failure gap in receipt scanning when signed out.
- Any confidence score, alternative estimates, or "did you mean" disambiguation from Claude.
- Rate limiting / cost controls beyond what `scan-receipt` already has (none).
- Editing/re-estimating an already-saved extra meal from `ItemDetail` (only the add-flow sheet
  is in scope).
