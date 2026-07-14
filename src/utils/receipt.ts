import { ReceiptLine, FoodItem, Macros } from '../types'

export function lineToFoodItem(line: ReceiptLine, macrosPer100g?: Macros, quantity?: number): FoodItem {
  return {
    name: line.name,
    weightG: line.weightG,
    kcal: line.kcal,
    emoji: '🛒',
    source: 'receipt',
    macrosPer100g,
    // quantity is a separate multiplier on FoodItem; only carry it when meaningful
    ...(quantity != null && quantity > 1 ? { quantity } : {}),
  }
}
