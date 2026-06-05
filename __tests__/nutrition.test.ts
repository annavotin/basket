import { kcalForWeight, totalKcal, cycleBudget } from '../src/utils/nutrition'
import { FoodItem } from '../src/types'

describe('kcalForWeight', () => {
  it('computes kcal from kcal/100g and grams, rounded', () => {
    expect(kcalForWeight(110, 800)).toBe(880)
    expect(kcalForWeight(34, 600)).toBe(204)
    expect(kcalForWeight(379, 50)).toBe(190) // 189.5 -> 190
  })
})

describe('totalKcal', () => {
  it('sums item kcal', () => {
    const items: FoodItem[] = [
      { name: 'a', weightG: 1, kcal: 200, emoji: '🥦' },
      { name: 'b', weightG: 1, kcal: 350, emoji: '🍗' },
    ]
    expect(totalKcal(items)).toBe(550)
  })
  it('returns 0 for empty', () => {
    expect(totalKcal([])).toBe(0)
  })
})

describe('cycleBudget', () => {
  it('multiplies days by the daily goal', () => {
    expect(cycleBudget(4)).toBe(8000)
    expect(cycleBudget(3, 1800)).toBe(5400)
  })
})

const item = (kcal: number, quantity?: number): FoodItem => ({
  name: 'x', weightG: 100, kcal, emoji: '🛒', quantity,
})

describe('totalKcal with quantity', () => {
  it('treats a missing quantity as 1', () => {
    expect(totalKcal([item(200), item(50)])).toBe(250)
  })
  it('multiplies each item kcal by its quantity', () => {
    expect(totalKcal([item(200, 3), item(50, 2)])).toBe(700)
  })
})
