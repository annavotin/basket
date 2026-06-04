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
})
