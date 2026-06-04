export type Product = {
  name: string
  emoji: string
  packageWeightG: number
  kcalPer100g: number
}

export const MOCK_PRODUCTS: Product[] = [
  { name: 'Chicken Breast', emoji: '🍗', packageWeightG: 800, kcalPer100g: 110 },
  { name: 'Brown Rice', emoji: '🍚', packageWeightG: 500, kcalPer100g: 130 },
  { name: 'Broccoli', emoji: '🥦', packageWeightG: 600, kcalPer100g: 34 },
  { name: 'Greek Yogurt', emoji: '🥛', packageWeightG: 500, kcalPer100g: 59 },
  { name: 'Salmon Fillet', emoji: '🐟', packageWeightG: 600, kcalPer100g: 208 },
  { name: 'Sweet Potato', emoji: '🍠', packageWeightG: 500, kcalPer100g: 86 },
  { name: 'Eggs (dozen)', emoji: '🥚', packageWeightG: 600, kcalPer100g: 143 },
  { name: 'Oats', emoji: '🌾', packageWeightG: 1000, kcalPer100g: 379 },
]

export function pickRandomProduct(rng: () => number = Math.random): Product {
  return MOCK_PRODUCTS[Math.floor(rng() * MOCK_PRODUCTS.length)]
}
