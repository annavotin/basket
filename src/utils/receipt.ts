import { ReceiptLine, FoodItem, Macros } from '../types'

export function lineToFoodItem(line: ReceiptLine, macrosPer100g?: Macros): FoodItem {
  return {
    name: line.name,
    weightG: line.weightG,
    kcal: line.kcal,
    emoji: '🛒',
    source: 'receipt',
    macrosPer100g,
  }
}
