import { Product } from '../mockProducts'
import { FoodSuggestion } from '../foods'
import { Macros } from '../types'
import { usdaLookupByBarcode } from './usda'
import { fetchWithRetry } from './http'
import { roundTenth } from '../utils/nutrition'

export const OFF_USER_AGENT = 'basket-mealprep/1.0 (contact@example.com)'

// Request the whole `nutriments` object and read everything (energy + macros) out of
// it. Do NOT also list bare `proteins_100g`/`carbohydrates_100g`/`fat_100g`: OFF's API
// treats those as top-level fields, flattens them, and then OMITS the `nutriments`
// object entirely — which drops `energy-kcal_100g` and makes every lookup miss.
const FIELDS = 'product_name,brands,product_quantity,quantity,nutriments'
const BASE = 'https://world.openfoodfacts.org/api/v2/product'

const offHeaders: Record<string, string> = { 'User-Agent': OFF_USER_AGENT }

export function parseQuantityG(s: unknown): number | null {
  if (typeof s !== 'string') return null
  const m = s.match(/^\s*([\d.,]+)\s*(kg|g|l|ml)?/i)
  if (!m) return null
  const value = parseFloat(m[1].replace(',', '.'))
  if (!Number.isFinite(value)) return null
  const unit = m[2]?.toLowerCase()
  const grams = unit === 'kg' || unit === 'l' ? value * 1000 : value
  const rounded = Math.round(grams)
  return rounded > 0 ? rounded : null
}

type Deps = { fetch: typeof fetch }

function macrosFrom(nutriments: any): Macros | undefined {
  const p = nutriments?.proteins_100g, c = nutriments?.carbohydrates_100g, f = nutriments?.fat_100g
  if ([p, c, f].some((n) => typeof n !== 'number')) return undefined
  return { protein: p, carbs: c, fat: f }
}

function packageWeightFrom(p: any): number | undefined {
  const numeric = parseFloat(p?.product_quantity)
  if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric)
  return parseQuantityG(p?.quantity) ?? undefined
}

export async function lookupProductByBarcode(
  barcode: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<Product | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(barcode)}?fields=${FIELDS}`
    const res = await fetchWithRetry(url, { headers: offHeaders }, deps.fetch)
    if (!res || !res.ok) return null
    const json: any = await res.json()
    const p = json?.product
    if (!p) return null

    const rawKcal = p.nutriments?.['energy-kcal_100g']
    const rawKj = p.nutriments?.['energy_100g']
    const kcalPer100g =
      typeof rawKcal === 'number' && rawKcal > 0
        ? rawKcal
        : typeof rawKj === 'number' && rawKj > 0
          ? rawKj / 4.184
          : null
    if (kcalPer100g === null) return null

    const qty = parseFloat(p.product_quantity)
    const packageWeightG =
      Number.isFinite(qty) && qty > 0
        ? Math.round(qty)
        : parseQuantityG(p.quantity) ?? 0  // 0 = unknown; sheet leaves weight blank to fill

    const name =
      typeof p.product_name === 'string' && p.product_name.trim()
        ? p.product_name.trim()
        : `Product ${barcode}`

    return { name, emoji: '🛒', packageWeightG, kcalPer100g: roundTenth(kcalPer100g), macrosPer100g: macrosFrom(p.nutriments) }
  } catch {
    return null
  }
}

/** Resolve a scanned barcode: try Open Food Facts first, then USDA FoodData Central. */
export async function lookupBarcode(
  barcode: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<Product | null> {
  const off = await lookupProductByBarcode(barcode, deps)
  console.log(`[barcode] OFF ${off ? 'hit' : 'miss'}: ${barcode}`)
  if (off) return off
  const usda = await usdaLookupByBarcode(barcode, deps)
  console.log(`[barcode] USDA ${usda ? 'hit' : 'miss'}: ${barcode}`)
  return usda
}

export async function searchProductsByName(
  query: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<FoodSuggestion[]> {
  try {
    const url =
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}` +
      `&fields=product_name,nutriments,product_quantity&page_size=15`
    const res = await deps.fetch(url, { headers: offHeaders })
    if (!res || !res.ok) return []
    const json: any = await res.json()
    const hits: any[] = Array.isArray(json?.hits) ? json.hits : []
    const out: FoodSuggestion[] = []
    for (const p of hits) {
      const kcalPer100g = p?.nutriments?.['energy-kcal_100g']
      const name = typeof p?.product_name === 'string' ? p.product_name.trim() : ''
      if (typeof kcalPer100g !== 'number' || kcalPer100g <= 0 || !name) continue
      out.push({ name, emoji: '🛒', kcalPer100g: roundTenth(kcalPer100g), packageWeightG: packageWeightFrom(p), source: 'off', macrosPer100g: macrosFrom(p?.nutriments) })
    }
    return out
  } catch {
    return []
  }
}
