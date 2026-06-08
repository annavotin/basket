export type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
  quantity?: number
  source?: 'barcode' | 'receipt' | 'manual'
}

export type MealPrepCycle = {
  id: string
  startDate: string  // ISO "YYYY-MM-DD"
  endDate: string
  items: FoodItem[]
  pantryOverrides?: Record<string, number>
}

export type PantryItem = {
  id: string
  name: string
  emoji: string
  kcalPer100g: number
  dailyG: number
}

export type ExtraMeal = {
  id: string
  date: string  // ISO "YYYY-MM-DD"
  name: string
  kcal: number
}

export type ReceiptLine = {
  id: string
  name: string
  weightG: number
  kcal: number
  isFood: boolean
}

export type WeeklyTab = 'basket' | 'extras' | 'pantry'
