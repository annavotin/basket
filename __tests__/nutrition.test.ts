import { kcalForWeight, totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate } from '../src/utils/nutrition'
import { FoodItem, ExtraMeal } from '../src/types'

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

const extras: ExtraMeal[] = [
  { id: 'a', date: '2026-06-02', name: 'Bar', kcal: 220 },
  { id: 'b', date: '2026-06-03', name: 'Coffee', kcal: 90 },
  { id: 'c', date: '2026-06-03', name: 'Cake', kcal: 400 },
  { id: 'd', date: '2026-06-10', name: 'Pizza', kcal: 800 },
]

describe('extrasKcalInRange', () => {
  it('sums kcal of extras with date within [start, end] inclusive', () => {
    expect(extrasKcalInRange(extras, '2026-06-01', '2026-06-04')).toBe(710) // a+b+c
  })
  it('returns 0 when none fall in range', () => {
    expect(extrasKcalInRange(extras, '2026-07-01', '2026-07-31')).toBe(0)
  })
})

describe('extrasKcalOnDate', () => {
  it('sums kcal of extras on an exact date', () => {
    expect(extrasKcalOnDate(extras, '2026-06-03')).toBe(490) // b+c
  })
  it('returns 0 for a date with no extras', () => {
    expect(extrasKcalOnDate(extras, '2026-06-09')).toBe(0)
  })
})
