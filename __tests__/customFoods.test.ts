import {
  customFoodFromItem, upsertCustomFood, findCustomByBarcode, findCustomByName, customFoodToProduct, searchCustomFoods,
} from '../src/services/customFoods'
import { CustomFood, FoodItem } from '../src/types'

const item = (over: Partial<FoodItem> = {}): FoodItem => ({
  name: 'Lidl Strawberries', weightG: 400, kcal: 128, emoji: '🍓',
  macrosPer100g: { protein: 0.7, carbs: 8, fat: 0.3 }, ...over,
})

describe('customFoodFromItem', () => {
  it('derives per-100g kcal from total kcal + weight', () => {
    const food = customFoodFromItem(item(), '20012345')
    expect(food).not.toBeNull()
    expect(food!.kcalPer100g).toBe(32) // 128 / 400 * 100
    expect(food!.packageWeightG).toBe(400)
    expect(food!.barcode).toBe('20012345')
    expect(food!.macrosPer100g).toEqual({ protein: 0.7, carbs: 8, fat: 0.3 })
  })

  it('returns null without a usable weight or name', () => {
    expect(customFoodFromItem(item({ weightG: 0 }))).toBeNull()
    expect(customFoodFromItem(item({ name: '   ' }))).toBeNull()
  })

  it('omits the barcode when none is given', () => {
    expect(customFoodFromItem(item())!.barcode).toBeUndefined()
  })
})

describe('upsertCustomFood', () => {
  const base: CustomFood = {
    id: 'a', name: 'Strawberries', emoji: '🍓', kcalPer100g: 32, barcode: '111',
    createdAt: 1, updatedAt: 1,
  }

  it('inserts a new food at the front', () => {
    const next = upsertCustomFood([base], { ...base, id: 'b', name: 'Kale', barcode: '222' })
    expect(next).toHaveLength(2)
    expect(next[0].name).toBe('Kale')
  })

  it('updates in place when the barcode matches (no duplicate)', () => {
    const next = upsertCustomFood([base], { ...base, id: 'b', name: 'Strawberries XL', kcalPer100g: 40, barcode: '111' })
    expect(next).toHaveLength(1)
    expect(next[0].id).toBe('a') // kept original id
    expect(next[0].kcalPer100g).toBe(40)
    expect(next[0].name).toBe('Strawberries XL')
  })

  it('matches by name when barcodes are absent', () => {
    const noBc: CustomFood = { ...base, barcode: undefined }
    const next = upsertCustomFood([noBc], { ...noBc, id: 'b', name: 'strawberries', kcalPer100g: 33 })
    expect(next).toHaveLength(1)
    expect(next[0].kcalPer100g).toBe(33)
  })
})

describe('lookup + search', () => {
  const foods: CustomFood[] = [
    { id: 'a', name: 'Strawberries', emoji: '🍓', kcalPer100g: 32, packageWeightG: 400, barcode: '111', createdAt: 1, updatedAt: 1 },
    { id: 'b', name: 'Oat Milk', emoji: '🥛', kcalPer100g: 45, barcode: '222', createdAt: 1, updatedAt: 1 },
  ]

  it('finds a saved food by barcode', () => {
    expect(findCustomByBarcode(foods, '222')!.name).toBe('Oat Milk')
    expect(findCustomByBarcode(foods, '999')).toBeNull()
  })

  it('finds a saved food by case-insensitive name', () => {
    expect(findCustomByName(foods, 'oat milk')!.id).toBe('b')
    expect(findCustomByName(foods, 'STRAWBERRIES')!.id).toBe('a')
    expect(findCustomByName(foods, 'Kale')).toBeNull()
    expect(findCustomByName(foods, '')).toBeNull()
  })

  it('maps to a Product shape', () => {
    expect(customFoodToProduct(foods[0])).toEqual({
      name: 'Strawberries', emoji: '🍓', packageWeightG: 400, kcalPer100g: 32, macrosPer100g: undefined,
    })
  })

  it('name-searches case-insensitively', () => {
    const hits = searchCustomFoods(foods, 'oat')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ name: 'Oat Milk', source: 'local' })
    expect(searchCustomFoods(foods, '')).toEqual([])
  })
})
