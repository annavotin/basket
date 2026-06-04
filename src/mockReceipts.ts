import { ReceiptLine } from './types'

export const MOCK_RECEIPT_LINES: ReceiptLine[] = [
  { id: 'r1', name: 'Chicken Thighs', weightG: 1000, kcal: 1770, isFood: true },
  { id: 'r2', name: 'Basmati Rice', weightG: 1000, kcal: 1300, isFood: true },
  { id: 'r3', name: 'Spinach', weightG: 200, kcal: 46, isFood: true },
  { id: 'r4', name: 'Olive Oil', weightG: 500, kcal: 4050, isFood: true },
  { id: 'r5', name: 'TOTAL £14.20', weightG: 0, kcal: 0, isFood: false },
]

export function getMockReceiptLines(): ReceiptLine[] {
  return MOCK_RECEIPT_LINES.map((line) => ({ ...line }))
}
