import { ReceiptLine, FoodItem } from '../types'

export function lineToFoodItem(line: ReceiptLine): FoodItem {
  return {
    name: line.name,
    weightG: line.weightG,
    kcal: line.kcal,
    emoji: '🛒',
    source: 'receipt',
  }
}
