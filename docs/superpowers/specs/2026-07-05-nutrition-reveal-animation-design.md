# Nutrition-fields reveal animation

Tapping "Edit" on a picked/scanned food in AddItemSheet currently snaps the NutritionFields
(Calories/Protein/Carbs/Fat) into existence instantly — jarring per user feedback.

## Design (approved via visual-companion mockup iteration)

- NutritionFields becomes a distinct white rounded card (it currently has no card background).
- On Edit tap, that card animates in as if sliding out from behind whatever sits directly above
  it in the layout (the pack-size block for picked/scanned items) — tucked under by a small
  negative margin so the element above it keeps its full corner radius (reads as one complete
  card sitting on top of another).
- Motion is a slide (clipped height grows + inner content translates down into place), not a
  fade. One-shot: only opens, never collapses in current UX (`editing` never reverts to false
  within a sheet visit).
- Scope: only the `editing && ...` gated NutritionFields render (AddItemSheet.tsx ~line 693).
  The always-visible custom-add-card NutritionFields (no Edit gate, fully custom typed item)
  is untouched — no reveal interaction exists there today.

## Implementation approach

- `Animated.Value` (`nutritionReveal`, 0→1), driven by `Animated.timing` (existing app
  convention — no reanimated dependency; see AddFab.tsx/ItemDetail.tsx for precedent).
- Outer `Animated.View`: `overflow:hidden`, animated `height` interpolated 0 → fixed estimate
  constant during the transition only; once `.start(({finished}) => ...)` fires, switch to
  `height: undefined` (auto) so real content size takes over at rest — avoids needing exact
  content measurement for a one-shot, one-directional reveal.
- Inner `Animated.View`: `transform: translateY` interpolated `-estimate → 0` in the same timing.
- Card gets `backgroundColor`, `borderRadius`, and the same shadow treatment already used for
  `productSummary`/`toggleGroup` in this file, plus `marginTop: -14` to tuck under the element
  above.
- Reset `nutritionReveal` to 0 and the "fully open" flag to false everywhere `editing` resets
  to false (product-change effect, `pick()`), so a later Edit tap re-animates from collapsed.

No new dependencies. Touches only `src/components/AddItemSheet.tsx`.
