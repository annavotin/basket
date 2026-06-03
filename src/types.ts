export type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
}

export type MealPrepCycle = {
  id: string
  startDate: string  // ISO "YYYY-MM-DD"
  endDate: string
  items: FoodItem[]
}

export type ExtraMeal = {
  id: string
  date: string  // ISO "YYYY-MM-DD"
  name: string
  kcal: number
}
