export type FoodSuggestion = {
  name: string
  emoji: string
  kcalPer100g: number
  packageWeightG?: number
  source: 'local' | 'off'
}

type LocalFood = { name: string; emoji: string; kcalPer100g: number }

// Curated, produce-heavy list of common foods (kcal per 100g).
export const LOCAL_FOODS: LocalFood[] = [
  { name: 'Apple', emoji: '🍎', kcalPer100g: 52 },
  { name: 'Banana', emoji: '🍌', kcalPer100g: 89 },
  { name: 'Orange', emoji: '🍊', kcalPer100g: 47 },
  { name: 'Strawberries', emoji: '🍓', kcalPer100g: 32 },
  { name: 'Blueberries', emoji: '🫐', kcalPer100g: 57 },
  { name: 'Grapes', emoji: '🍇', kcalPer100g: 69 },
  { name: 'Pear', emoji: '🍐', kcalPer100g: 57 },
  { name: 'Peach', emoji: '🍑', kcalPer100g: 39 },
  { name: 'Pineapple', emoji: '🍍', kcalPer100g: 50 },
  { name: 'Mango', emoji: '🥭', kcalPer100g: 60 },
  { name: 'Watermelon', emoji: '🍉', kcalPer100g: 30 },
  { name: 'Lemon', emoji: '🍋', kcalPer100g: 29 },
  { name: 'Avocado', emoji: '🥑', kcalPer100g: 160 },
  { name: 'Tomato', emoji: '🍅', kcalPer100g: 18 },
  { name: 'Potato', emoji: '🥔', kcalPer100g: 77 },
  { name: 'Sweet Potato', emoji: '🍠', kcalPer100g: 86 },
  { name: 'Carrot', emoji: '🥕', kcalPer100g: 41 },
  { name: 'Broccoli', emoji: '🥦', kcalPer100g: 34 },
  { name: 'Spinach', emoji: '🥬', kcalPer100g: 23 },
  { name: 'Lettuce', emoji: '🥬', kcalPer100g: 15 },
  { name: 'Cucumber', emoji: '🥒', kcalPer100g: 15 },
  { name: 'Bell Pepper', emoji: '🫑', kcalPer100g: 31 },
  { name: 'Onion', emoji: '🧅', kcalPer100g: 40 },
  { name: 'Garlic', emoji: '🧄', kcalPer100g: 149 },
  { name: 'Mushrooms', emoji: '🍄', kcalPer100g: 22 },
  { name: 'Corn', emoji: '🌽', kcalPer100g: 86 },
  { name: 'Peas', emoji: '🟢', kcalPer100g: 81 },
  { name: 'Green Beans', emoji: '🫛', kcalPer100g: 31 },
  { name: 'Eggplant', emoji: '🍆', kcalPer100g: 25 },
  { name: 'Zucchini', emoji: '🥒', kcalPer100g: 17 },
  { name: 'Cauliflower', emoji: '🥦', kcalPer100g: 25 },
  { name: 'Cabbage', emoji: '🥬', kcalPer100g: 25 },
  { name: 'Celery', emoji: '🥬', kcalPer100g: 16 },
  { name: 'Chicken Breast', emoji: '🍗', kcalPer100g: 165 },
  { name: 'Chicken Thigh', emoji: '🍗', kcalPer100g: 209 },
  { name: 'Ground Beef', emoji: '🥩', kcalPer100g: 250 },
  { name: 'Steak', emoji: '🥩', kcalPer100g: 271 },
  { name: 'Pork Chop', emoji: '🥩', kcalPer100g: 231 },
  { name: 'Salmon', emoji: '🐟', kcalPer100g: 208 },
  { name: 'Tuna', emoji: '🐟', kcalPer100g: 132 },
  { name: 'Shrimp', emoji: '🦐', kcalPer100g: 99 },
  { name: 'Eggs', emoji: '🥚', kcalPer100g: 143 },
  { name: 'Milk', emoji: '🥛', kcalPer100g: 42 },
  { name: 'Greek Yogurt', emoji: '🥛', kcalPer100g: 59 },
  { name: 'Cheddar Cheese', emoji: '🧀', kcalPer100g: 402 },
  { name: 'Butter', emoji: '🧈', kcalPer100g: 717 },
  { name: 'White Rice', emoji: '🍚', kcalPer100g: 130 },
  { name: 'Brown Rice', emoji: '🍚', kcalPer100g: 123 },
  { name: 'Pasta', emoji: '🍝', kcalPer100g: 131 },
  { name: 'Bread', emoji: '🍞', kcalPer100g: 265 },
  { name: 'Oats', emoji: '🌾', kcalPer100g: 379 },
  { name: 'Quinoa', emoji: '🌾', kcalPer100g: 120 },
  { name: 'Flour', emoji: '🌾', kcalPer100g: 364 },
  { name: 'Sugar', emoji: '🍬', kcalPer100g: 387 },
  { name: 'Olive Oil', emoji: '🫒', kcalPer100g: 884 },
  { name: 'Almonds', emoji: '🌰', kcalPer100g: 579 },
  { name: 'Peanut Butter', emoji: '🥜', kcalPer100g: 588 },
  { name: 'Black Beans', emoji: '🫘', kcalPer100g: 132 },
  { name: 'Chickpeas', emoji: '🫘', kcalPer100g: 164 },
  { name: 'Lentils', emoji: '🫘', kcalPer100g: 116 },
  { name: 'Tofu', emoji: '⬜', kcalPer100g: 76 },
  { name: 'Honey', emoji: '🍯', kcalPer100g: 304 },
  { name: 'Dark Chocolate', emoji: '🍫', kcalPer100g: 546 },
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
