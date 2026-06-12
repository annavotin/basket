import { MealPrepCycle, ExtraMeal, FoodItem, PantryItem, Preferences } from './types'

export const DAILY_KCAL_GOAL = 2000

export const DEFAULT_PREFERENCES: Preferences = {
  name: '',
  defaultDays: 4,
  units: { weight: 'g', energy: 'kcal' },
  theme: 'system',
  accent: ['#7CC96E', '#5FB152', '#3E8F38'],
  macroTargets: { protein: 140, carbs: 220, fat: 70 },
}

export const cycles: MealPrepCycle[] = [
  {
    id: 'cycle-1',
    startDate: '2026-05-31',
    endDate: '2026-06-04',
    items: [
      { name: 'Broccoli', weightG: 600, kcal: 204, emoji: '🥦' },
      { name: 'Spinach', weightG: 300, kcal: 69, emoji: '🥬' },
      { name: 'Chicken Breast', weightG: 800, kcal: 880, emoji: '🍗' },
      { name: 'Brown Rice', weightG: 500, kcal: 650, emoji: '🍚' },
    ],
  },
  {
    id: 'cycle-2',
    startDate: '2026-06-05',
    endDate: '2026-06-09',
    items: [
      { name: 'Salmon', weightG: 600, kcal: 1254, emoji: '🐟' },
      { name: 'Sweet Potato', weightG: 500, kcal: 430, emoji: '🍠' },
      { name: 'Kale', weightG: 200, kcal: 66, emoji: '🥬' },
    ],
  },
]

export const extraMeals: ExtraMeal[] = [
  { id: 'extra-1', date: '2026-06-02', name: 'Protein Bar', kcal: 220 },
  { id: 'extra-2', date: '2026-06-03', name: 'Coffee + Oat Milk', kcal: 90 },
]

export const pantry: PantryItem[] = [
  { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 },
]
