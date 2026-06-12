import { formatWeight, formatEnergy } from '../src/utils/units'

describe('formatWeight', () => {
  it('returns rounded grams with a space before g', () => {
    expect(formatWeight(600, { weight: 'g', energy: 'kcal' })).toBe('600 g')
  })

  it('converts to oz with one decimal place', () => {
    // 600 / 28.3495 = 21.163... → '21.2 oz'
    expect(formatWeight(600, { weight: 'oz', energy: 'kcal' })).toBe('21.2 oz')
  })

  it('rounds grams to nearest integer', () => {
    expect(formatWeight(100.7, { weight: 'g', energy: 'kcal' })).toBe('101 g')
  })
})

describe('formatEnergy', () => {
  it('returns rounded kcal with a space before kcal', () => {
    expect(formatEnergy(204, { weight: 'g', energy: 'kcal' })).toBe('204 kcal')
  })

  it('converts to kJ and rounds', () => {
    // 204 * 4.184 = 853.536 → 854 kJ
    expect(formatEnergy(204, { weight: 'g', energy: 'kJ' })).toBe('854 kJ')
  })

  it('rounds kcal to nearest integer', () => {
    expect(formatEnergy(100.6, { weight: 'g', energy: 'kcal' })).toBe('101 kcal')
  })
})
