import { FoodSuggestion } from '../foods'
import { usdaSearchByName } from './usda'

export type EstimateResult = { kcal: number; protein: number; carbs: number; fat: number }

export type DecomposedItem = {
  item: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/** Sanitize the estimate-extra edge function's decomposition into a list of DecomposedItem,
 *  dropping any individually malformed entries. Null if the payload/array is missing or every
 *  item is malformed — nothing usable to ground or fall back on. */
export function parseDecomposedItems(data: unknown): DecomposedItem[] | null {
  const d = data as { items?: unknown } | null | undefined
  if (!d || !Array.isArray(d.items)) return null
  const items = d.items
    .map((it): DecomposedItem | null => {
      const o = it as Record<string, unknown>
      if (typeof o?.item !== 'string' || !o.item.trim()) return null
      const grams = Number(o.grams)
      const kcal = Number(o.kcal)
      const protein = Number(o.protein)
      const carbs = Number(o.carbs)
      const fat = Number(o.fat)
      if (![grams, kcal, protein, carbs, fat].every(isFiniteNumber)) return null
      return { item: o.item.trim(), grams, kcal, protein, carbs, fat }
    })
    .filter((it): it is DecomposedItem => it !== null)
  return items.length > 0 ? items : null
}

type Invoke = (body: { description: string }) => Promise<unknown>
type UsdaSearch = (query: string) => Promise<FoodSuggestion[]>

/** Look up one decomposed item against USDA FoodData Central and scale its per-100g nutrition
 *  by the item's estimated grams. Falls back to the item's own (AI-guessed) nutrition when
 *  there's no usable match — offline/error-safe: a thrown search resolves to the fallback. */
async function groundItem(item: DecomposedItem, usdaSearch: UsdaSearch): Promise<EstimateResult> {
  try {
    const hits = await usdaSearch(item.item)
    const best = hits.find((h) => h.kcalPer100g > 0)
    if (best) {
      const factor = item.grams / 100
      return {
        kcal: best.kcalPer100g * factor,
        protein: (best.macrosPer100g?.protein ?? 0) * factor,
        carbs: (best.macrosPer100g?.carbs ?? 0) * factor,
        fat: (best.macrosPer100g?.fat ?? 0) * factor,
      }
    }
  } catch {
    // fall through to the AI's own per-item guess
  }
  return { kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat }
}

/** Ask the backend to decompose a described dish into itemized components, then ground each
 *  component in USDA FoodData Central (falling back to the AI's own per-item guess where there's
 *  no database match) and sum into a single estimate. Offline/error-safe: any thrown error from
 *  the backend call resolves to null rather than rejecting. */
export async function estimateExtra(
  description: string,
  invoke: Invoke,
  usdaSearch: UsdaSearch = usdaSearchByName
): Promise<EstimateResult | null> {
  try {
    const data = await invoke({ description })
    const items = parseDecomposedItems(data)
    if (!items) return null

    const grounded = await Promise.all(items.map((it) => groundItem(it, usdaSearch)))
    const summed = grounded.reduce(
      (acc, r) => ({
        kcal: acc.kcal + r.kcal,
        protein: acc.protein + r.protein,
        carbs: acc.carbs + r.carbs,
        fat: acc.fat + r.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
    return {
      kcal: Math.max(0, Math.round(summed.kcal)),
      protein: Math.max(0, Math.round(summed.protein * 10) / 10),
      carbs: Math.max(0, Math.round(summed.carbs * 10) / 10),
      fat: Math.max(0, Math.round(summed.fat * 10) / 10),
    }
  } catch {
    return null
  }
}
