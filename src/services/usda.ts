import { Product } from '../mockProducts'
import { FoodSuggestion } from '../foods'
import { Macros } from '../types'
import { fetchWithRetry } from './http'
import { roundTenth } from '../utils/nutrition'

// USDA FoodData Central. A free api.data.gov key goes in EXPO_PUBLIC_USDA_API_KEY;
// DEMO_KEY works for light testing but is heavily rate-limited (get a real one).
const API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY'
const SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search'

type Deps = { fetch: typeof fetch }

/** USDA descriptions are usually SHOUTING ("KALE, RAW"); make them readable. */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function nutrientValue(food: any, num: string, name: string): number | undefined {
  const ns = Array.isArray(food?.foodNutrients) ? food.foodNutrients : []
  const hit = ns.find((n: any) => String(n.nutrientNumber) === num || n.nutrientName === name)
  return typeof hit?.value === 'number' ? hit.value : undefined
}

/** Energy in kcal per 100g (FDC normalises foodNutrients to per-100g). */
function kcalPer100g(food: any): number | null {
  const ns = Array.isArray(food?.foodNutrients) ? food.foodNutrients : []
  const e = ns.find(
    (n: any) =>
      (String(n.nutrientNumber) === '208' || n.nutrientName === 'Energy') &&
      String(n.unitName).toUpperCase() === 'KCAL'
  )
  return typeof e?.value === 'number' && e.value > 0 ? e.value : null
}

function macrosFrom(food: any): Macros | undefined {
  const p = nutrientValue(food, '203', 'Protein')
  const c = nutrientValue(food, '205', 'Carbohydrate, by difference')
  const f = nutrientValue(food, '204', 'Total lipid (fat)')
  if ([p, c, f].some((v) => typeof v !== 'number')) return undefined
  return { protein: p as number, carbs: c as number, fat: f as number }
}

/** Package weight from the serving size when given in g/ml, else 0 (unknown). */
function packageWeightG(food: any): number {
  const size = parseFloat(food?.servingSize)
  const unit = String(food?.servingSizeUnit || '').toLowerCase()
  if (Number.isFinite(size) && size > 0 && (unit === 'g' || unit === 'ml')) return Math.round(size)
  return 0
}

export async function usdaLookupByBarcode(
  barcode: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<Product | null> {
  try {
    const url = `${SEARCH}?query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=10&api_key=${API_KEY}`
    const res = await fetchWithRetry(url, {}, deps.fetch)
    if (!res || !res.ok) return null
    const json: any = await res.json()
    const foods: any[] = Array.isArray(json?.foods) ? json.foods : []
    const norm = (s: unknown) => String(s ?? '').replace(/^0+/, '')
    const food = foods.find((f) => norm(f.gtinUpc) === norm(barcode)) ?? foods[0]
    if (!food) return null
    const kcal = kcalPer100g(food)
    if (kcal == null) return null
    const name =
      typeof food.description === 'string' && food.description.trim()
        ? titleCase(food.description.trim())
        : `Product ${barcode}`
    return { name, emoji: '🛒', packageWeightG: packageWeightG(food), kcalPer100g: roundTenth(kcal), macrosPer100g: macrosFrom(food) }
  } catch {
    return null
  }
}

export async function usdaSearchByName(
  query: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<FoodSuggestion[]> {
  try {
    const url =
      `${SEARCH}?query=${encodeURIComponent(query)}` +
      `&dataType=Foundation,SR%20Legacy,Branded&pageSize=20&api_key=${API_KEY}`
    const res = await deps.fetch(url)
    if (!res.ok) return []
    const json: any = await res.json()
    const foods: any[] = Array.isArray(json?.foods) ? json.foods : []
    const out: FoodSuggestion[] = []
    for (const f of foods) {
      const kcal = kcalPer100g(f)
      const name = typeof f.description === 'string' ? titleCase(f.description.trim()) : ''
      if (kcal == null || !name) continue
      out.push({
        name,
        emoji: '🛒',
        kcalPer100g: roundTenth(kcal),
        packageWeightG: packageWeightG(f) || undefined,
        source: 'usda',
        macrosPer100g: macrosFrom(f),
      })
    }
    return out
  } catch {
    return []
  }
}
