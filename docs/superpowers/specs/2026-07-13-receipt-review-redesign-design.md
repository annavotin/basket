# Spec: Receipt-review redesign (per-item detail sheet)

_2026-07-13_

**Goal:** Fix the receipt-scanning review step (`ReceiptReviewSheet`), which testing surfaced as cramped, unclear, and buggy: it's not obvious the name is editable, the `kcal` field's meaning (total for the item vs. per 100g) is ambiguous, the numeric keyboard has no way to dismiss, and the keyboard covers the bottom of the list while editing the last row. Replace inline row-editing with a read-only row list (name/weight/kcal + include checkbox) and a new stacked per-item edit sheet, `ReceiptLineDetail`, modeled on the existing `ItemDetail` pattern.

---

## Decisions (locked with the user)

- **Stacked modal**, not in-place swap: tapping a row opens `ReceiptLineDetail` over the list, matching how tapping a batch item opens `ItemDetail` today. Dismiss returns to the list untouched.
- **New sibling component**, not a 4th `ItemDetail` kind: a receipt line is a pre-confirmation draft with none of `ItemDetail`'s persisted-item semantics (bought stats, days, delete-with-confirm). Forcing it into `ItemDetail`'s kind union would add branching to an already-dense component. `ReceiptLineDetail` mirrors `ItemDetail`'s visual language (header, `NutritionFields`, labeled fields, Save/Cancel) without carrying what a draft doesn't have.
- **Macros and per-100g toggle are in scope**, via the existing `NutritionFields` component — for consistency with how every other item type is edited in this app, even though the receipt scanner never estimates macros (they start blank/zero, editable, labeled "estimated").
- **Basis starts at `"total"`**, not `"per100g"`, when opening a receipt line's detail — `"total"` is the number the scanner actually produced (`ReceiptLine.kcal` is documented in `supabase/functions/scan-receipt/index.ts` as "TOTAL calories for that item, not per 100g"); the toggle is still available if the user wants to enter a per-100g figure instead.
- **No quantity field** on the draft editor — matches today's behavior; quantity is set later once the item is actually in the batch, via the existing `ItemDetail`.
- **No delete/remove step** in `ReceiptLineDetail` — unchecking the row's checkbox already removes it from the confirmed outcome; nothing is persisted yet to delete.
- **Checkbox stays on the row** for quick bulk include/exclude without opening detail for every line (e.g. excluding a "bag fee" line).

Out of scope: changing `ExtraMealSheet` or any other sheet, even if it has similar issues — this fix is scoped to the receipt-review flow only, per the bug report.

---

## Current state (for reference)

`src/components/ReceiptReviewSheet.tsx`:
- Renders one row per `ReceiptLine`, each with a checkbox and three inline `TextInput`s (name, weight, kcal) directly in the list — no `KeyboardAvoidingView`, no keyboard-dismiss affordance.
- `Row` type: `{ id, name, weight: string, kcal: string, included: boolean }` — no macros, no per-100g concept.
- `ReceiptLine` (`src/types.ts`) has no macros at all: `{ id, name, weightG, kcal, isFood }`. `kcal` is the scanner's best-guess **total** calories for the line's estimated weight (confirmed in the edge function prompt).
- `lineToFoodItem` (`src/utils/receipt.ts`) maps a `Row` straight to a `FoodItem`, dropping any macro information (there isn't any today).

Reference patterns being reused:
- `src/components/ItemDetail.tsx` — the "tap a row → detail sheet with Edit/Save/Cancel" pattern, `NutritionFields` usage, and the `kcalPer100g = weightG > 0 ? roundTenth((kcal / weightG) * 100) : null` conversion for kind `'item'`.
- `src/components/AddItemSheet.tsx` and `src/components/DismissArea.tsx` — the `KeyboardAvoidingView` + `DismissArea` + `ScrollView(keyboardShouldPersistTaps="handled")` combination that avoids both keyboard bugs.
- `src/components/NutritionFields.tsx` — canonical per-100g storage with a `basis` (`'per100g' | 'total'`) toggle for display/entry.

---

## Data model changes

`src/types.ts` — extend `ReceiptLine`... no change needed (it stays scanner-output-shaped). The macro/basis state lives only in the review sheet's local draft state, not in `ReceiptLine` itself.

`src/components/ReceiptReviewSheet.tsx` — `Row` gains two fields:
```ts
type Row = {
  id: string
  name: string
  weight: string
  kcal: string
  included: boolean
  kcalPer100g: number | null   // NEW — derived once from kcal/weightG on load
  macrosPer100g?: Macros       // NEW — undefined until the user edits macros
}
```
`toRows()` derives `kcalPer100g` the same way `ItemDetail` does: `l.weightG > 0 ? roundTenth((l.kcal / l.weightG) * 100) : null`.

`src/utils/receipt.ts` — `lineToFoodItem` forwards `macrosPer100g` when present, instead of silently dropping it:
```ts
export function lineToFoodItem(line: ReceiptLine, macrosPer100g?: Macros): FoodItem {
  return { name: line.name, weightG: line.weightG, kcal: line.kcal, emoji: '🛒', source: 'receipt', macrosPer100g }
}
```

---

## Components

### `ReceiptReviewSheet.tsx` (modified)

- Row rendering drops all `TextInput`s. Each row becomes a tappable card: checkbox (unchanged behavior) + name + a single meta line (`"420 g · 610 kcal"`), styled like the app's existing `itemCard`/`suggestionCard` list rows (rounded corners, subtle shadow) instead of the current plain box.
- Tapping anywhere on the row body (not the checkbox) opens `ReceiptLineDetail` for that row.
- Sheet root gets wrapped in `KeyboardAvoidingView` (`behavior: Platform.OS === 'ios' ? 'padding' : undefined`) and `DismissArea`, matching `AddItemSheet`. (Belt-and-suspenders: once `ReceiptLineDetail` is the only place with text inputs, this sheet itself may no longer need keyboard handling — kept for safety since the name search / future inline affordances could reintroduce a field here.)
- `update(id, patch)` extended to accept `kcalPer100g`/`macrosPer100g` patches from `ReceiptLineDetail`'s Save callback, and recomputes the display `kcal` via `kcalForWeight(kcalPer100g, weightG)`.
- `handleConfirm()` passes each row's `macrosPer100g` through `lineToFoodItem`.

### `ReceiptLineDetail.tsx` (new)

Stacked `Modal`, sibling to `ItemDetail`, not a new kind on it. Structure:
- `KeyboardAvoidingView` + `DismissArea` + `ScrollView(keyboardShouldPersistTaps="handled")`, matching `AddItemSheet`/`ItemDetail`.
- Header: emoji placeholder (🛒) + editable Name field + live total-kcal readout, visually modeled on `ItemDetail`'s head row.
- `NutritionFields` — `basis` state local to this sheet, initialized to `'total'`; `G` = the draft's `weightG`; `kcalPer100g`/`macrosPer100g` from the draft row; `editable`. Section label reads "Macros · estimated" (reusing `ItemDetail`'s existing hint convention) whenever `macrosPer100g` is still unset.
- Weight (g) field, plain labeled input like `ItemDetail`'s `renderField('Weight (g)', ...)`. Matches `ItemDetail`'s existing rescale behavior: `kcalPer100g`/`macrosPer100g` stay the canonical, weight-independent values; changing weight only changes `NutritionFields`' `G` prop, which live-rescales the *displayed* total kcal/macros proportionally. Typing directly into a macro/kcal field (in either basis) still overrides that field's canonical value, same as everywhere else `NutritionFields` is used.
- Footer: Cancel / Save. Save calls back with `{ name, weightG, kcalPer100g, macrosPer100g }`; Cancel discards local edits. No delete/remove action.

Props:
```ts
type Props = {
  visible: boolean
  line: { id: string; name: string; weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros } | null
  onSave: (id: string, patch: { name: string; weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros }) => void
  onClose: () => void
}
```

---

## Testing

Existing tests targeting `ReceiptReviewSheet`'s inline `TextInput`s (testIDs `name-${id}`, `weight-${id}`, `kcal-${id}`) move to `ReceiptLineDetail` and get rewritten to cover:
1. List rows render read-only (no `TextInput` present on a row) plus a working include/exclude checkbox.
2. Tapping a row opens `ReceiptLineDetail` pre-filled with that row's current name/weight/kcal (converted to per-100g correctly).
3. Editing and Save propagates the new values back to the row, including macros, and `confirm-receipt` produces `FoodItem`s carrying `macrosPer100g` when set.
4. Cancel from the detail sheet leaves the row unchanged.

Keyboard-avoidance and dismiss-on-tap-outside aren't meaningfully unit-testable in RNTL/jest (no native keyboard/layout measurement) — verified manually by running the app (`/run` or equivalent) after implementation, per the bug report's repro steps (edit the last row in a long list, confirm the field stays visible above the keyboard; open the numeric pad, tap outside, confirm it dismisses).
