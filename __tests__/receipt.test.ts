import { lineToFoodItem } from '../src/utils/receipt'

describe('lineToFoodItem', () => {
  it('maps a receipt line to a FoodItem tagged as receipt source', () => {
    const item = lineToFoodItem({
      id: 'r1',
      name: 'Chicken Thighs',
      weightG: 1000,
      kcal: 1770,
      isFood: true,
    })
    expect(item).toEqual({
      name: 'Chicken Thighs',
      weightG: 1000,
      kcal: 1770,
      emoji: '🛒',
      source: 'receipt',
    })
  })

  it('forwards macrosPer100g when provided', () => {
    const item = lineToFoodItem(
      { id: 'r1', name: 'Chicken Thighs', weightG: 1000, kcal: 1770, isFood: true },
      { protein: 22, carbs: 0, fat: 8 }
    )
    expect(item.macrosPer100g).toEqual({ protein: 22, carbs: 0, fat: 8 })
  })

  it('omits macrosPer100g when not provided', () => {
    const item = lineToFoodItem({ id: 'r1', name: 'Chicken Thighs', weightG: 1000, kcal: 1770, isFood: true })
    expect(item.macrosPer100g).toBeUndefined()
  })

  it('forwards quantity when greater than 1', () => {
    const item = lineToFoodItem(
      { id: 'r1', name: 'Yogurt', weightG: 150, kcal: 90, isFood: true },
      undefined,
      2
    )
    expect(item.quantity).toBe(2)
  })

  it('omits quantity when 1 or not provided', () => {
    const one = lineToFoodItem({ id: 'r1', name: 'Yogurt', weightG: 150, kcal: 90, isFood: true }, undefined, 1)
    const none = lineToFoodItem({ id: 'r1', name: 'Yogurt', weightG: 150, kcal: 90, isFood: true })
    expect(one.quantity).toBeUndefined()
    expect(none.quantity).toBeUndefined()
  })
})
