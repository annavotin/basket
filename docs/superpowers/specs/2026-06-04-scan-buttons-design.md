# Scan Barcode & Scan Receipt — Design Spec (for review)

**Date:** 2026-06-04
**Status:** Draft for your review — not yet planned/implemented
**Context:** The "New shop" panel currently has two stub buttons (Scan Barcode, Scan Receipt) that pop a "Coming soon" alert. This spec proposes what they do.

> This is a proposal written while you were away. Recommendations are marked **★ Recommended**. Open choices are collected in **Decisions for your review** at the end. Nothing here is built yet.

---

## 1. Shared purpose

Both buttons exist to **add food items to a meal prep cycle**. They are two input methods for the same outcome: populating a cycle's `items: FoodItem[]` with the food you bought/have for that period.

- **Scan Barcode** = add **one product at a time**, precisely (point camera at a package).
- **Scan Receipt** = add a **whole shop at once**, quickly (photograph a grocery receipt).

This connects to the app's core idea: a cycle has a calorie **budget** (`2000 kcal × days`). As you add food, the app shows how well-stocked you are against that budget — e.g. "you've added 6,400 of 8,000 kcal for this 4-day period."

### Implication for the current UI

Right now the detail area branches: empty cycle → `NewPeriodPanel` (with scan buttons); cycle with items → `MealPrepDetail` (food list, no way to add more). That's a dead end once the first item lands.

**Proposed refinement:** scanning should be reachable whether the cycle is empty or not. Concretely, the period detail becomes one view that always shows:
1. A **"stocked vs. budget"** summary at the top (e.g. a progress bar: `6,400 / 8,000 kcal`).
2. The **food list** (empty-state illustration when there's nothing yet — the 🛍️ "New shop" look).
3. A persistent **"+ Add items"** affordance exposing **Scan Barcode / Scan Receipt** (+ "Enter manually").

So the `NewPeriodPanel` evolves into the period detail view; the empty state is just its zero-items appearance.

---

## 2. Scan Barcode — flow

1. **Tap "Scan Barcode."**
2. **Camera permission.** First use requests camera access. If denied, show a short explainer with a "Open Settings" button; offer "Enter manually" as a fallback.
3. **Scanner screen.** Full-screen live camera with a framing guide. Detects retail barcodes (EAN-13, UPC-A, EAN-8). A small "× items added" counter and a "Done" button are visible.
4. **On detection.** Light haptic + brief freeze of the frame; look the barcode up in a food database (see §5).
5. **Result:**
   - **Found** → product card: name, brand, kcal per 100 g, category emoji, (optional macros). Prompt for **quantity**:
     - default to the package weight if the DB provides it (e.g. 500 g), editable in grams; or a "× units" stepper for multi-pack.
     - computed item kcal = `kcal_per_100g × grams / 100`.
   - **Not found** → "We couldn't find that product" with two options: **Enter manually** (name + total kcal + weight) or **Scan again**.
6. **Confirm** → append a `FoodItem` to the active cycle and return to the scanner for the next item (rapid multi-scan). 
7. **Done** → back to the period detail; food list and "stocked vs. budget" update.

**Duplicate handling:** if the same barcode is scanned twice, ask "Add another or update quantity?" (default: add as a separate line — simplest, and meal prep often involves multiples). ★ Recommended: add separate line.

---

## 3. Scan Receipt — flow

1. **Tap "Scan Receipt."**
2. **Capture.** Choose **Take photo** or **Pick from library**. Allow multi-page (long receipts) — optional for v1.
3. **Extraction.** Send the image to an OCR/vision step (see §5) that returns candidate line items: `{ rawText, quantity, estimatedKcal?, matchedName? }`.
4. **Matching.** Each raw line is fuzzy-matched against the food database to recover a clean name + nutrition, with a per-line **confidence** score. Receipt names are cryptic ("ORG BROC 500G"), so confidence will vary.
5. **Review screen** (the important part — never silently trust OCR):
   - An editable list, one row per detected line: matched product name (editable), weight/quantity (editable), kcal (editable), and a confidence indicator.
   - Each row has an **include/exclude** toggle (non-food lines like "TOTAL", "VISA" default to excluded).
   - Low-confidence or unmatched rows are flagged for a quick manual fix or removal.
6. **Confirm** → **bulk-append** all included rows to the cycle.
7. Back to the period detail; list + budget update.

**Why a mandatory review step:** receipt OCR + nutrition matching is inherently noisy. The user must be able to correct before anything is committed. This also keeps the "garbage in" cases from corrupting the calorie budget.

---

## 4. Data model implications

`FoodItem` today: `{ name, weightG, kcal, emoji }`. Proposed **optional** additions (so existing dummy data still type-checks):

```ts
type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
  brand?: string
  barcode?: string
  macros?: { proteinG: number; carbsG: number; fatG: number }
  source?: 'barcode' | 'receipt' | 'manual'
}
```

`source` is handy for analytics/debugging and lets the UI show where an item came from. Macros are optional groundwork for a future macros view (the original brainstorm mentioned macro goals).

---

## 5. Technical approach

### Camera + barcode scanning
**★ `expo-camera`** (`CameraView` with built-in barcode scanning). First-class in Expo SDK 54.
- ⚠️ **Important constraint:** camera/barcode scanning generally requires a **development build** (or a production build), **not** plain Expo Go. This means a one-time `eas build --profile development` (or local prebuild) and installing that custom dev client on your phone. Worth flagging now because it changes the run workflow we've been using.

### Barcode → nutrition lookup
**★ Open Food Facts** — free, no API key, barcode-indexed, global coverage:
`GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json` → `product.product_name`, `product.brands`, `product.nutriments["energy-kcal_100g"]`, protein/carb/fat per 100 g, `product.quantity`.
- Alternative: **USDA FoodData Central** (needs a free key, US-centric, stronger for generic/unbranded foods). Could be a secondary fallback.

### Receipt OCR
Hardest piece. Two viable routes:
- **★ Vision LLM** (send the photo to a multimodal model, ask for structured JSON line items). Most robust for messy real-world receipts and can estimate nutrition in one shot. Costs per call + needs network + receipt is sent off-device (privacy note).
- Cloud OCR (Google Cloud Vision / AWS Textract) + custom parsing. More plumbing, still needs a nutrition-matching layer afterward.

### Manual entry
A shared lightweight form (`name`, `weightG`, `kcal`) used as the fallback for both flows and as a standalone "Enter manually" option. Cheap to build, removes hard dependencies on camera/network for basic use.

---

## 6. Recommended phasing

The two buttons share infrastructure: a way to **add `FoodItem`(s) to the active cycle**, a **confirm/review** step, and the **budget recalculation**. Build that spine once.

- **Phase 1 — Scan Barcode + Manual entry.** `expo-camera` + Open Food Facts + the manual-entry form + the "stocked vs. budget" detail view. High value, reliable, no OCR risk. Proves the item-adding pipeline.
- **Phase 2 — Scan Receipt.** Vision-LLM extraction + the review screen, reusing Phase 1's add/confirm/budget code.

Each phase is its own spec → plan → implementation cycle.

---

## 7. Edge cases & error handling

- Camera permission denied → explainer + manual fallback.
- Offline / API failure → fall back to manual entry; don't lose a scanned barcode.
- Barcode not in database → manual entry or rescan.
- Receipt OCR returns junk / low confidence → flagged in review, never auto-committed.
- Duplicate scans → add-separate (default) vs. merge-quantity.
- Editing / deleting items after they're added (needed once items exist).
- Expo Go vs. dev build limitation for the camera (see §5).

---

## 8. Decisions for your review

1. **Quantity input model:** grams (default to package size, editable) vs. servings vs. unit count? — ★ default to package weight in grams, editable; add a "× units" stepper for multipacks.
2. **Food database:** Open Food Facts only, or OFF + USDA fallback? — ★ start with OFF only.
3. **Receipt OCR engine:** vision LLM vs. cloud OCR? — ★ vision LLM.
4. **"Stocked vs. budget" framing:** is showing `added kcal / (2000 × days)` the right mental model, or do you want something else (e.g. per-day stocked, or macro-aware)? — ★ total-stocked vs. total-budget for v1.
5. **Make scanning always available** (not only on empty cycles), turning `NewPeriodPanel` into the full period-detail view? — ★ yes.
6. **Privacy:** OK with sending barcode/receipt data to third-party services (OFF / vision LLM)? Flagging because it affects the OCR choice.
7. **Build workflow:** OK to move to a development build (needed for the camera), stepping beyond Expo Go? — ★ yes, when we start Phase 1.

---

## 9. Out of scope (for these buttons)

- Inventory depletion / "what have I eaten" tracking (the earlier-dropped consumption sliders).
- Price tracking / budgeting in money.
- Recipe parsing, meal planning, or portioning prepped food into daily containers.
- Carry-over of unused items to the next cycle (separate feature).
