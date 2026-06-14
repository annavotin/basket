export type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
  quantity?: number
  source?: 'barcode' | 'receipt' | 'manual' | 'carry'
  macrosPer100g?: Macros
}

export type MealPrepCycle = {
  id: string
  startDate: string  // ISO "YYYY-MM-DD"
  endDate: string
  items: FoodItem[]
  pantryOverrides?: Record<string, number>
  updatedAt?: string         // ISO; set on every local mutation
  deletedAt?: string | null  // ISO when soft-deleted; null/absent = live
}

export type PantryItem = {
  id: string
  name: string
  emoji: string
  kcalPer100g: number
  dailyG: number
  updatedAt?: string         // ISO; set on every local mutation
  deletedAt?: string | null  // ISO when soft-deleted; null/absent = live
}

export type ExtraMeal = {
  id: string
  date: string  // ISO "YYYY-MM-DD"
  name: string
  kcal: number
  updatedAt?: string         // ISO; set on every local mutation
  deletedAt?: string | null  // ISO when soft-deleted; null/absent = live
}

export type ReceiptLine = {
  id: string
  name: string
  weightG: number
  kcal: number
  isFood: boolean
}

export type WeeklyTab = 'basket' | 'extras' | 'pantry'

export type WeightUnit = 'g' | 'oz'
export type EnergyUnit = 'kcal' | 'kJ'
export type ThemePref = 'light' | 'dark' | 'system'

export type Macros = { protein: number; carbs: number; fat: number }

export type MacroTargets = { protein: number; carbs: number; fat: number }

export type Preferences = {
  name: string
  defaultDays: number
  units: { weight: WeightUnit; energy: EnergyUnit }
  theme: ThemePref
  accent: [string, string, string]
  macroTargets: MacroTargets
}
