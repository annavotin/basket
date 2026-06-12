import { kcalForWeight, totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate, pantryGramsForCycle, pantryKcalForCycle, kcalDerivedMacros, ringArcs, itemSharePct } from '../src/utils/nutrition'
import { FoodItem, ExtraMeal, PantryItem, MealPrepCycle } from '../src/types'

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

const oats: PantryItem = { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 }
const nuts: PantryItem = { id: 'pantry-nuts', name: 'Nuts', emoji: '🥜', kcalPer100g: 600, dailyG: 20 }

const baseCycle: MealPrepCycle = {
  id: 'cycle-test',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  items: [],
}

describe('pantryGramsForCycle', () => {
  it('returns dailyG * days when no override is present', () => {
    // 40 g/day * 5 days = 200
    expect(pantryGramsForCycle(oats, baseCycle, 5)).toBe(200)
  })

  it('returns the override value when present', () => {
    const cycle: MealPrepCycle = { ...baseCycle, pantryOverrides: { 'pantry-oats': 150 } }
    expect(pantryGramsForCycle(oats, cycle, 5)).toBe(150)
  })

  it('returns the override value of 0 when explicitly overridden to 0', () => {
    const cycle: MealPrepCycle = { ...baseCycle, pantryOverrides: { 'pantry-oats': 0 } }
    expect(pantryGramsForCycle(oats, cycle, 5)).toBe(0)
  })
})

describe('pantryKcalForCycle', () => {
  it('sums kcalForWeight across all pantry items using default dailyG', () => {
    // Oats: kcalForWeight(379, 200) = round(379*200/100) = round(758) = 758
    // Nuts: kcalForWeight(600, 100) = round(600*100/100) = 600
    // Total: 758 + 600 = 1358
    expect(pantryKcalForCycle([oats, nuts], baseCycle, 5)).toBe(1358)
  })

  it('uses override grams when pantryOverrides are set', () => {
    const cycle: MealPrepCycle = {
      ...baseCycle,
      pantryOverrides: { 'pantry-oats': 100 }, // override oats to 100g
    }
    // Oats: kcalForWeight(379, 100) = 379
    // Nuts: kcalForWeight(600, 100) = 600 (5 days * 20 g/day = 100)
    expect(pantryKcalForCycle([oats, nuts], cycle, 5)).toBe(979)
  })

  it('returns 0 for an empty pantry items array', () => {
    expect(pantryKcalForCycle([], baseCycle, 5)).toBe(0)
  })
})

describe('kcalDerivedMacros', () => {
  it('splits kcal into P/C/F grams (25/45/30, 4/4/9 kcal-per-g)', () => {
    expect(kcalDerivedMacros(2000)).toEqual({ protein: 125, carbs: 225, fat: 67 })
  })
  it('is zero at zero kcal', () => {
    expect(kcalDerivedMacros(0)).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })
})

describe('ringArcs', () => {
  it('returns fraction-of-budget and cumulative offset per value', () => {
    const arcs = ringArcs([2500, 2500, 0], 10000)
    expect(arcs[0]).toEqual({ fraction: 0.25, offset: 0 })
    expect(arcs[1]).toEqual({ fraction: 0.25, offset: 0.25 })
    expect(arcs[2]).toEqual({ fraction: 0, offset: 0.5 })
  })
  it('clamps a single value to the full ring and handles zero budget', () => {
    expect(ringArcs([99999], 1000)[0].fraction).toBe(1)
    expect(ringArcs([100], 0)[0]).toEqual({ fraction: 0, offset: 0 })
  })
})

describe('itemSharePct', () => {
  it('is the item kcal as a percent of the total', () => {
    expect(itemSharePct(250, 1000)).toBe(25)
  })
  it('is 0 when the total is 0', () => {
    expect(itemSharePct(250, 0)).toBe(0)
  })
})
