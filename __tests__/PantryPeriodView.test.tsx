import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import PantryPeriodView from '../src/components/PantryPeriodView'
import { PantryItem, MealPrepCycle } from '../src/types'

const oats: PantryItem = { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 }
const cycle: MealPrepCycle = { id: 'c', startDate: '2026-06-01', endDate: '2026-06-05', items: [] }

describe('PantryPeriodView', () => {
  it('shows an empty hint when there are no staples', () => {
    const { getByText } = render(
      <PantryPeriodView cycle={cycle} pantry={[]} cycleDays={5} />
    )
    expect(getByText(/No pantry staples/)).toBeTruthy()
  })

  it('renders grams (40×5=200) and kcal (758) for a staple with no override', () => {
    const { getAllByTestId, getByTestId, getByText } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} />
    )
    expect(getAllByTestId('pantry-detail-row')).toHaveLength(1)
    expect(getByTestId('pantry-grams').props.value).toBe('200')
    expect(getByText('758 kcal')).toBeTruthy()
  })

  it('uses an override value from pantryOverrides', () => {
    const overridden: MealPrepCycle = { ...cycle, pantryOverrides: { 'pantry-oats': 120 } }
    const { getByTestId } = render(
      <PantryPeriodView cycle={overridden} pantry={[oats]} cycleDays={5} />
    )
    expect(getByTestId('pantry-grams').props.value).toBe('120')
  })

  it('fires onSetPantryGrams with the id and parsed grams on change', () => {
    const onSetPantryGrams = jest.fn()
    const { getByTestId } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} onSetPantryGrams={onSetPantryGrams} />
    )
    fireEvent.changeText(getByTestId('pantry-grams'), '150')
    expect(onSetPantryGrams).toHaveBeenCalledWith('pantry-oats', 150)
  })
})
