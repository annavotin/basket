import { Product } from '../mockProducts'

export const OFF_USER_AGENT = 'basket-mealprep/1.0 (contact@example.com)'

const FIELDS = 'product_name,brands,product_quantity,quantity,nutriments'
const BASE = 'https://world.openfoodfacts.org/api/v2/product'

const DEFAULT_PACKAGE_G = 100

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

export async function lookupProductByBarcode(
  barcode: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<Product | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(barcode)}?fields=${FIELDS}`
    const res = await deps.fetch(url, { headers: { 'User-Agent': OFF_USER_AGENT } })
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

    return { name, emoji: '🛒', packageWeightG, kcalPer100g }
  } catch {
    return null
  }
}
