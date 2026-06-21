import { CustomFood, FoodItem } from '../types'
import { Product } from '../mockProducts'
import { FoodSuggestion } from '../foods'

const norm = (s: string) => s.trim().toLowerCase()

export function newCustomId(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Derive a reusable custom food from an item the user just added. Returns null when there
 * isn't enough information to store a sensible per-100g value (no name, or unknown weight/kcal).
 */
export function customFoodFromItem(item: FoodItem, barcode?: string): CustomFood | null {
  const name = item.name?.trim()
  if (!name) return null
  if (!(item.weightG > 0) || !(item.kcal > 0)) return null
  const kcalPer100g = Math.round((item.kcal / item.weightG) * 1000) / 10
  const now = Date.now()
  return {
    id: newCustomId(),
    name,
    emoji: item.emoji || '🛒',
    kcalPer100g,
    macrosPer100g: item.macrosPer100g,
    packageWeightG: item.weightG,
    barcode: barcode || undefined,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Insert or update a custom food. Matches an existing entry by barcode (when both have one),
 * otherwise by case-insensitive name, so re-adding the same product updates it in place.
 */
export function upsertCustomFood(list: CustomFood[], food: CustomFood): CustomFood[] {
  const idx = list.findIndex((f) =>
    food.barcode && f.barcode ? f.barcode === food.barcode : norm(f.name) === norm(food.name),
  )
  if (idx === -1) return [food, ...list]
  const existing = list[idx]
  const next = list.slice()
  next[idx] = {
    ...existing,
    name: food.name,
    emoji: food.emoji,
    kcalPer100g: food.kcalPer100g,
    macrosPer100g: food.macrosPer100g ?? existing.macrosPer100g,
    packageWeightG: food.packageWeightG ?? existing.packageWeightG,
    barcode: food.barcode ?? existing.barcode,
    updatedAt: Date.now(),
  }
  return next
}

export function findCustomByBarcode(list: CustomFood[], barcode: string): CustomFood | null {
  if (!barcode) return null
  return list.find((f) => f.barcode === barcode) ?? null
}

/** Map a saved custom food into the Product shape the Add sheet consumes. */
export function customFoodToProduct(f: CustomFood): Product {
  return {
    name: f.name,
    emoji: f.emoji,
    packageWeightG: f.packageWeightG ?? 0,
    kcalPer100g: f.kcalPer100g,
    macrosPer100g: f.macrosPer100g,
  }
}

/** Name-search the user's saved foods (surfaced first in the Add sheet's suggestions). */
export function searchCustomFoods(list: CustomFood[], query: string): FoodSuggestion[] {
  const q = norm(query)
  if (!q) return []
  return list
    .filter((f) => norm(f.name).includes(q))
    .map((f) => ({
      name: f.name,
      emoji: f.emoji,
      kcalPer100g: f.kcalPer100g,
      packageWeightG: f.packageWeightG,
      source: 'local' as const,
      macrosPer100g: f.macrosPer100g,
    }))
}
