import { Macros } from './types'

export type FoodSuggestion = {
  name: string
  emoji: string
  kcalPer100g: number
  packageWeightG?: number
  source: 'local' | 'off'
  macrosPer100g?: Macros
}

type LocalFood = { name: string; emoji: string; kcalPer100g: number; macrosPer100g: Macros }

// Curated, produce-heavy list of common foods (kcal per 100g).
export const LOCAL_FOODS: LocalFood[] = [
  { name: 'Apple', emoji: '🍎', kcalPer100g: 52, macrosPer100g: { protein: 0.3, carbs: 14, fat: 0.2 } },
  { name: 'Banana', emoji: '🍌', kcalPer100g: 89, macrosPer100g: { protein: 1.1, carbs: 23, fat: 0.3 } },
  { name: 'Orange', emoji: '🍊', kcalPer100g: 47, macrosPer100g: { protein: 0.9, carbs: 12, fat: 0.1 } },
  { name: 'Strawberries', emoji: '🍓', kcalPer100g: 32, macrosPer100g: { protein: 0.7, carbs: 8, fat: 0.3 } },
  { name: 'Blueberries', emoji: '🫐', kcalPer100g: 57, macrosPer100g: { protein: 0.7, carbs: 14, fat: 0.3 } },
  { name: 'Grapes', emoji: '🍇', kcalPer100g: 69, macrosPer100g: { protein: 0.7, carbs: 18, fat: 0.2 } },
  { name: 'Pear', emoji: '🍐', kcalPer100g: 57, macrosPer100g: { protein: 0.4, carbs: 15, fat: 0.1 } },
  { name: 'Peach', emoji: '🍑', kcalPer100g: 39, macrosPer100g: { protein: 0.9, carbs: 10, fat: 0.3 } },
  { name: 'Pineapple', emoji: '🍍', kcalPer100g: 50, macrosPer100g: { protein: 0.5, carbs: 13, fat: 0.1 } },
  { name: 'Mango', emoji: '🥭', kcalPer100g: 60, macrosPer100g: { protein: 0.8, carbs: 15, fat: 0.4 } },
  { name: 'Watermelon', emoji: '🍉', kcalPer100g: 30, macrosPer100g: { protein: 0.6, carbs: 8, fat: 0.2 } },
  { name: 'Lemon', emoji: '🍋', kcalPer100g: 29, macrosPer100g: { protein: 1.1, carbs: 9, fat: 0.3 } },
  { name: 'Avocado', emoji: '🥑', kcalPer100g: 160, macrosPer100g: { protein: 2, carbs: 9, fat: 15 } },
  { name: 'Tomato', emoji: '🍅', kcalPer100g: 18, macrosPer100g: { protein: 0.9, carbs: 4, fat: 0.2 } },
  { name: 'Potato', emoji: '🥔', kcalPer100g: 77, macrosPer100g: { protein: 2, carbs: 17, fat: 0.1 } },
  { name: 'Sweet Potato', emoji: '🍠', kcalPer100g: 86, macrosPer100g: { protein: 1.6, carbs: 20, fat: 0.1 } },
  { name: 'Carrot', emoji: '🥕', kcalPer100g: 41, macrosPer100g: { protein: 0.9, carbs: 10, fat: 0.2 } },
  { name: 'Broccoli', emoji: '🥦', kcalPer100g: 34, macrosPer100g: { protein: 2.8, carbs: 7, fat: 0.4 } },
  { name: 'Spinach', emoji: '🥬', kcalPer100g: 23, macrosPer100g: { protein: 2.9, carbs: 3.6, fat: 0.4 } },
  { name: 'Lettuce', emoji: '🥬', kcalPer100g: 15, macrosPer100g: { protein: 1.4, carbs: 2.9, fat: 0.2 } },
  { name: 'Cucumber', emoji: '🥒', kcalPer100g: 15, macrosPer100g: { protein: 0.7, carbs: 3.6, fat: 0.1 } },
  { name: 'Bell Pepper', emoji: '🫑', kcalPer100g: 31, macrosPer100g: { protein: 1, carbs: 7, fat: 0.3 } },
  { name: 'Onion', emoji: '🧅', kcalPer100g: 40, macrosPer100g: { protein: 1.1, carbs: 9, fat: 0.1 } },
  { name: 'Garlic', emoji: '🧄', kcalPer100g: 149, macrosPer100g: { protein: 6.4, carbs: 33, fat: 0.5 } },
  { name: 'Mushrooms', emoji: '🍄', kcalPer100g: 22, macrosPer100g: { protein: 3.1, carbs: 3.3, fat: 0.3 } },
  { name: 'Corn', emoji: '🌽', kcalPer100g: 86, macrosPer100g: { protein: 3.3, carbs: 19, fat: 1.4 } },
  { name: 'Peas', emoji: '🟢', kcalPer100g: 81, macrosPer100g: { protein: 5.4, carbs: 14, fat: 0.4 } },
  { name: 'Green Beans', emoji: '🫛', kcalPer100g: 31, macrosPer100g: { protein: 1.8, carbs: 7, fat: 0.1 } },
  { name: 'Eggplant', emoji: '🍆', kcalPer100g: 25, macrosPer100g: { protein: 1, carbs: 6, fat: 0.2 } },
  { name: 'Zucchini', emoji: '🥒', kcalPer100g: 17, macrosPer100g: { protein: 1.2, carbs: 3.1, fat: 0.3 } },
  { name: 'Cauliflower', emoji: '🥦', kcalPer100g: 25, macrosPer100g: { protein: 1.9, carbs: 5, fat: 0.3 } },
  { name: 'Cabbage', emoji: '🥬', kcalPer100g: 25, macrosPer100g: { protein: 1.3, carbs: 6, fat: 0.1 } },
  { name: 'Celery', emoji: '🥬', kcalPer100g: 16, macrosPer100g: { protein: 0.7, carbs: 3, fat: 0.2 } },
  { name: 'Chicken Breast', emoji: '🍗', kcalPer100g: 165, macrosPer100g: { protein: 31, carbs: 0, fat: 3.6 } },
  { name: 'Chicken Thigh', emoji: '🍗', kcalPer100g: 209, macrosPer100g: { protein: 26, carbs: 0, fat: 11 } },
  { name: 'Ground Beef', emoji: '🥩', kcalPer100g: 250, macrosPer100g: { protein: 26, carbs: 0, fat: 17 } },
  { name: 'Steak', emoji: '🥩', kcalPer100g: 271, macrosPer100g: { protein: 26, carbs: 0, fat: 19 } },
  { name: 'Pork Chop', emoji: '🥩', kcalPer100g: 231, macrosPer100g: { protein: 27, carbs: 0, fat: 14 } },
  { name: 'Salmon', emoji: '🐟', kcalPer100g: 208, macrosPer100g: { protein: 20, carbs: 0, fat: 13 } },
  { name: 'Tuna', emoji: '🐟', kcalPer100g: 132, macrosPer100g: { protein: 29, carbs: 0, fat: 1.3 } },
  { name: 'Shrimp', emoji: '🦐', kcalPer100g: 99, macrosPer100g: { protein: 20, carbs: 0.9, fat: 1.7 } },
  { name: 'Eggs', emoji: '🥚', kcalPer100g: 143, macrosPer100g: { protein: 13, carbs: 1.1, fat: 10 } },
  { name: 'Milk', emoji: '🥛', kcalPer100g: 42, macrosPer100g: { protein: 3.4, carbs: 5, fat: 1 } },
  { name: 'Greek Yogurt', emoji: '🥛', kcalPer100g: 59, macrosPer100g: { protein: 10, carbs: 3.6, fat: 0.4 } },
  { name: 'Cheddar Cheese', emoji: '🧀', kcalPer100g: 402, macrosPer100g: { protein: 25, carbs: 1.3, fat: 33 } },
  { name: 'Butter', emoji: '🧈', kcalPer100g: 717, macrosPer100g: { protein: 0.9, carbs: 0.1, fat: 81 } },
  { name: 'White Rice', emoji: '🍚', kcalPer100g: 130, macrosPer100g: { protein: 2.7, carbs: 28, fat: 0.3 } },
  { name: 'Brown Rice', emoji: '🍚', kcalPer100g: 123, macrosPer100g: { protein: 2.7, carbs: 26, fat: 1 } },
  { name: 'Pasta', emoji: '🍝', kcalPer100g: 131, macrosPer100g: { protein: 5, carbs: 25, fat: 1.1 } },
  { name: 'Bread', emoji: '🍞', kcalPer100g: 265, macrosPer100g: { protein: 9, carbs: 49, fat: 3.2 } },
  { name: 'Oats', emoji: '🌾', kcalPer100g: 379, macrosPer100g: { protein: 13, carbs: 68, fat: 6.9 } },
  { name: 'Quinoa', emoji: '🌾', kcalPer100g: 120, macrosPer100g: { protein: 4.4, carbs: 22, fat: 1.9 } },
  { name: 'Flour', emoji: '🌾', kcalPer100g: 364, macrosPer100g: { protein: 10, carbs: 76, fat: 1 } },
  { name: 'Sugar', emoji: '🍬', kcalPer100g: 387, macrosPer100g: { protein: 0, carbs: 100, fat: 0 } },
  { name: 'Olive Oil', emoji: '🫒', kcalPer100g: 884, macrosPer100g: { protein: 0, carbs: 0, fat: 100 } },
  { name: 'Almonds', emoji: '🌰', kcalPer100g: 579, macrosPer100g: { protein: 21, carbs: 22, fat: 50 } },
  { name: 'Peanut Butter', emoji: '🥜', kcalPer100g: 588, macrosPer100g: { protein: 25, carbs: 20, fat: 50 } },
  { name: 'Black Beans', emoji: '🫘', kcalPer100g: 132, macrosPer100g: { protein: 8.9, carbs: 24, fat: 0.5 } },
  { name: 'Chickpeas', emoji: '🫘', kcalPer100g: 164, macrosPer100g: { protein: 8.9, carbs: 27, fat: 2.6 } },
  { name: 'Lentils', emoji: '🫘', kcalPer100g: 116, macrosPer100g: { protein: 9, carbs: 20, fat: 0.4 } },
  { name: 'Tofu', emoji: '⬜', kcalPer100g: 76, macrosPer100g: { protein: 8, carbs: 1.9, fat: 4.8 } },
  { name: 'Honey', emoji: '🍯', kcalPer100g: 304, macrosPer100g: { protein: 0.3, carbs: 82, fat: 0 } },
  { name: 'Dark Chocolate', emoji: '🍫', kcalPer100g: 546, macrosPer100g: { protein: 5, carbs: 60, fat: 31 } },
]

const MAX_RESULTS = 8

export function searchLocalFoods(query: string): FoodSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matched = LOCAL_FOODS.filter((f) => f.name.toLowerCase().includes(q))
  matched.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1
    const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1
    if (ap !== bp) return ap - bp
    return a.name.localeCompare(b.name)
  })
  return matched.slice(0, MAX_RESULTS).map((f) => ({ ...f, source: 'local' as const }))
}
