import { Product } from '../mockProducts'
import { FoodSuggestion } from '../foods'
import { Macros } from '../types'

export const OFF_USER_AGENT = 'basket-mealprep/1.0 (contact@example.com)'

const FIELDS = 'product_name,brands,product_quantity,quantity,nutriments,proteins_100g,carbohydrates_100g,fat_100g'
const BASE = 'https://world.openfoodfacts.org/api/v2/product'
const SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl'
const SEARCH_FIELDS = 'product_name,product_quantity,quantity,nutriments,proteins_100g,carbohydrates_100g,fat_100g'

const DEFAULT_PACKAGE_G = 100

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
    const res = await deps.fetch(url, { headers: offHeaders })
    if (!res.ok) return null
    const json: any = await res.json()
    const p = json?.product
    if (!p) return null

    const kcalPer100g = p.nutriments?.['energy-kcal_100g']
    if (typeof kcalPer100g !== 'number' || kcalPer100g <= 0) return null

    const qty = parseFloat(p.product_quantity)
    const packageWeightG =
      Number.isFinite(qty) && qty > 0
        ? Math.round(qty)
        : parseQuantityG(p.quantity) ?? DEFAULT_PACKAGE_G

    const name =
      typeof p.product_name === 'string' && p.product_name.trim()
        ? p.product_name.trim()
        : `Product ${barcode}`

    return { name, emoji: '🛒', packageWeightG, kcalPer100g, macrosPer100g: macrosFrom(p.nutriments) }
  } catch {
    return null
  }
}

export async function searchProductsByName(
  query: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<FoodSuggestion[]> {
  try {
    const url =
      `${SEARCH_BASE}?search_terms=${encodeURIComponent(query)}` +
      `&json=1&page_size=20&fields=${SEARCH_FIELDS}`
    const res = await deps.fetch(url, { headers: offHeaders })
    if (!res.ok) return []
    const json: any = await res.json()
    const products: any[] = Array.isArray(json?.products) ? json.products : []
    const out: FoodSuggestion[] = []
    for (const p of products) {
      const kcalPer100g = p?.nutriments?.['energy-kcal_100g']
      const name = typeof p?.product_name === 'string' ? p.product_name.trim() : ''
      if (typeof kcalPer100g !== 'number' || kcalPer100g <= 0 || !name) continue
      out.push({ name, emoji: '🛒', kcalPer100g, packageWeightG: packageWeightFrom(p), source: 'off', macrosPer100g: macrosFrom(p?.nutriments) })
    }
    return out
  } catch {
    return []
  }
}
