import { FoodItem, ExtraMeal, PantryItem, MealPrepCycle, Macros, NutritionBasis } from '../types'

/** Round to the nearest tenth — DB energy values like 2.84444 kcal/100g read nicer as 2.8. */
export function roundTenth(n: number): number {
  return Math.round(n * 10) / 10
}

export function kcalForWeight(kcalPer100g: number, weightG: number): number {
  return Math.round((kcalPer100g * weightG) / 100)
}

export function totalKcal(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.kcal * (item.quantity ?? 1), 0)
}

export function cycleBudget(days: number, dailyGoal = 2000): number {
  return days * dailyGoal
}

export function extrasKcalInRange(extras: ExtraMeal[], start: string, end: string): number {
  return extras.reduce(
    (sum, e) => (e.date >= start && e.date <= end ? sum + e.kcal : sum),
    0
  )
}

export function extrasKcalOnDate(extras: ExtraMeal[], date: string): number {
  return extras.reduce((sum, e) => (e.date === date ? sum + e.kcal : sum), 0)
}

export function pantryGramsForCycle(item: PantryItem, cycle: MealPrepCycle, days: number): number {
  const o = cycle.pantryOverrides?.[item.id]
  return typeof o === 'number' ? o : item.dailyG * days
}

export function pantryKcalForCycle(items: PantryItem[], cycle: MealPrepCycle, days: number): number {
  return items.reduce(
    (sum, it) => sum + kcalForWeight(it.kcalPer100g, pantryGramsForCycle(it, cycle, days)),
    0
  )
}

/** Estimate consumed macros from total kcal: 25% protein, 45% carbs, 30% fat
 *  (protein/carbs 4 kcal/g, fat 9 kcal/g). Same estimate the design prototype ships. */
export function kcalDerivedMacros(consumedKcal: number): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((consumedKcal * 0.25) / 4),
    carbs: Math.round((consumedKcal * 0.45) / 4),
    fat: Math.round((consumedKcal * 0.30) / 9),
  }
}

/** For a segmented progress ring: each value's fraction of the budget plus the
 *  cumulative offset (also as a fraction of budget) of all preceding values. */
export function ringArcs(values: number[], budget: number): { fraction: number; offset: number }[] {
  let acc = 0
  return values.map((v) => {
    const fraction = budget > 0 ? Math.max(0, Math.min(1, v / budget)) : 0
    const offset = budget > 0 ? acc / budget : 0
    acc += v
    return { fraction, offset }
  })
}

/** An item's kcal as a percentage of the basket total. */
export function itemSharePct(itemKcal: number, totalKcal: number): number {
  return totalKcal > 0 ? (itemKcal / totalKcal) * 100 : 0
}

/** Build a new "carried over" item from the remaining grams of a prior item.
 *  weightG/kcal are per-unit, so per-unit kcal/g is quantity-independent —
 *  scale leftG by that per-unit rate rather than by the item's total. */
export function carriedItem(item: FoodItem, leftG: number): FoodItem {
  const w = item.weightG || 0
  const kcalPerG = w > 0 ? item.kcal / w : 0
  return {
    name: item.name,
    emoji: item.emoji,
    weightG: Math.round(leftG),
    kcal: Math.round(leftG * kcalPerG),
    source: 'carry',
    macrosPer100g: item.macrosPer100g,
  }
}

/** Total macro grams for an item (includes quantity), mirroring totalKcal.
 *  Uses the per-100g profile when present, else the kcal-derived estimate. */
export function itemMacros(item: FoodItem): Macros {
  const qty = item.quantity ?? 1
  if (item.macrosPer100g) {
    const f = (item.weightG / 100) * qty
    return {
      protein: item.macrosPer100g.protein * f,
      carbs: item.macrosPer100g.carbs * f,
      fat: item.macrosPer100g.fat * f,
    }
  }
  return kcalDerivedMacros(item.kcal * qty)
}

/** Aggregate macro grams for a basket: real per-food item macros (estimate per item
 *  when a food lacks a profile) plus the kcal-derived estimate for other sources. */
export function aggregateMacros(items: FoodItem[], otherKcal: number): Macros {
  const fromItems = items.reduce(
    (a, it) => {
      const m = itemMacros(it)
      return { protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }
    },
    { protein: 0, carbs: 0, fat: 0 }
  )
  const est = kcalDerivedMacros(otherKcal)
  return {
    protein: Math.round(fromItems.protein + est.protein),
    carbs: Math.round(fromItems.carbs + est.carbs),
    fat: Math.round(fromItems.fat + est.fat),
  }
}

/** Canonical per-100g value -> value displayed in `basis` over G grams (weight x qty). */
export function toBasis(per100g: number, G: number, basis: NutritionBasis): number {
  return basis === 'per100g' ? per100g : G > 0 ? (per100g * G) / 100 : 0
}

/** Value shown in `basis` over G grams -> canonical per-100g. */
export function fromBasis(shown: number, G: number, basis: NutritionBasis): number {
  return basis === 'per100g' ? shown : G > 0 ? (shown * 100) / G : 0
}
