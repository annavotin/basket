# Design — Add-item sheet flow redesign (progressive + summary/edit)

**Date:** 2026-07-02
**Status:** Approved (design); pending spec review -> implementation plan

## Summary

Make the add-item sheet less overwhelming and clearer, without changing what data it captures. Four changes:
1. **Progressive disclosure** — on open, show only the search bar; reveal the rest once a food is chosen or entered.
2. **Summary -> Edit** for foods with known values (picked from search, or scanned): a clean read-only summary with an **Edit** button, matching how scanned items already behave. Extend that pattern to search-picked foods.
3. **"Weight per pack"** label everywhere (quantity is a separate multiplier below).
4. **"Save to My Foods" only when warranted** — hidden until the item is genuinely new (fully custom) or you've actually edited a value. "Link a barcode" stays available regardless.

**Non-goals:** no change to the per-100g/total `NutritionFields` behavior, the underlying `customFoodFromItem`/`upsertCustomFood` save logic, barcode linking mechanics, or the data model. This is a presentation/gating change only.

## The three states

The sheet is always in one of three states, driven by whether a food is chosen and whether it's being edited:

| State | When | Shows |
|---|---|---|
| **Search** | manual, no food chosen yet (name empty / nothing picked) | title + search bar + (while typing) suggestions. Nothing else. |
| **Summary** | a food with known values is chosen (a picked suggestion, or a scanned product) and not being edited | read-only summary (name, **weight per pack**, nutrition via the 100g/total toggle, quantity, total kcal) + **Edit** button. "Link a barcode" if it has none. **No** "Save to My Foods". |
| **Edit** | you tapped **Edit** on a chosen food, OR you're entering a fully-custom food (typed a name with no match) | editable **weight per pack** + `NutritionFields` + quantity. "Save to My Foods" shown per the rule below. "Link a barcode" if it has none. |

### Entry-type flows
- **Pick from search / scan a barcode** -> **Summary**. Tap **Edit** -> **Edit**.
- **Type your own (no match)** -> **Edit** directly (there's nothing to summarize; you're creating it). Fields reveal after the name is non-empty.
- **Empty / just opened** -> **Search**.

## "Save to My Foods" gating

Show the toggle when the item is **new or changed**, else hide it:
- **Fully-custom food** (typed, no match): always shown, labeled **"Save to My Foods"** (default on). It's a brand-new food.
- **Picked/scanned food**: hidden in Summary; in Edit, appears **only once a value differs from the original** (dirty). When shown for a matched food it reads **"Update '<name>' in My Foods"**.

**Dirty detection:** when a food is chosen (picked suggestion or scanned product), capture the original `{ weightG, kcalPer100g, macrosPer100g }`. The item is "dirty" when the current weight or any nutrition value differs from that snapshot. `showSaveToggle = isFullyCustom || isDirty`.

**Deliberate consequence (confirmed with user):** a scanned or search-found product added *unchanged* is NOT saved to My Foods. Caching it happens by editing it, or via "Link a barcode".

## "Link a barcode"

Unchanged from today's behavior, just always available (independent of the save toggle) for a manual item that has no barcode yet. In Summary it can sit under the Edit button; in Edit, in the toggle group. Once linked, shows "Barcode linked ✓".

## Weight labeling

The weight field/label reads **"Weight per pack"** (was "Weight (g)" / "Pack"). Unit suffix (g/oz) still respected. This clarifies that quantity below is a separate ×N multiplier over the per-pack weight — consistent with the data model (`weightG` is per-unit).

## State model notes (for implementation)

Today the sheet uses `isManual`, `pickedSuggestion`, and `editing` (scanned-only). This redesign:
- Extends the `editing` concept to the manual flow (a chosen food starts in Summary, `editing=false`; **Edit** sets `editing=true`). A fully-custom typed food is treated as `editing=true` from the moment a name is entered.
- Adds an **original-values snapshot** (set in `pick()` and when a scanned product loads) for dirty comparison.
- Gates the Save-to-My-Foods row on `showSaveToggle`; gates weight/nutrition visibility on "a food is chosen or being entered" (progressive disclosure).
- Keeps `NutritionFields`, the quantity `Stepper`, kcal preview, and the add/save action as-is.

`AddItemSheet.tsx` is already large; this redesign is a good moment to make its render read as three clear state branches (Search / Summary / Edit) rather than the current overlapping `isManual`/`pickedSuggestion`/`editing` conditionals — a targeted clarity improvement, not a rewrite.

## Interaction with the parked P3 branch (nutrition-label OCR)

The parked `feat/nutrition-label-ocr` branch adds a "Scan label" button to the manual custom-entry card. In this redesign it has a natural home in the **Edit** state of a fully-custom food (alongside the search/weight), or as a capture affordance in **Search**. When P3 is later merged, reconcile the `AddItemSheet` conflict by placing "Scan label" there. Noted so the merge is intentional, not a surprise.

## Testing

Component tests (`__tests__/AddItemSheet.test.tsx`):
- Open (manual, empty) shows the search bar and NOT weight/nutrition/quantity.
- Picking a suggestion shows a summary + an Edit button and NOT the Save-to-My-Foods toggle.
- Tapping Edit reveals editable weight/nutrition; changing a value reveals "Update '<name>'".
- A fully-custom typed food reveals editable fields + "Save to My Foods".
- Weight label reads "Weight per pack".
- Existing add/save/barcode behaviors still pass (adjust selectors to the new states).
Keep `npx tsc --noEmit` and the full suite green.

## Open questions
None blocking.
