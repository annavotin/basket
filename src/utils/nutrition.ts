import { FoodItem, ExtraMeal, PantryItem, MealPrepCycle } from '../types'

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
