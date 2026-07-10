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
    const { getAllByTestId, getByText, getAllByText } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} />
    )
    expect(getAllByTestId('pantry-detail-row')).toHaveLength(1)
    expect(getByText(/200 g/)).toBeTruthy()
    // "758 kcal" appears in both the row subtitle and the period header total (single item).
    expect(getAllByText(/758 kcal/).length).toBeGreaterThan(0)
  })

  it('uses an override value from pantryOverrides', () => {
    const overridden: MealPrepCycle = { ...cycle, pantryOverrides: { 'pantry-oats': 120 } }
    const { getByText } = render(
      <PantryPeriodView cycle={overridden} pantry={[oats]} cycleDays={5} />
    )
    expect(getByText(/120 g/)).toBeTruthy()
  })

  it('tapping a row fires onOpenPantry with the item id', () => {
    const onOpenPantry = jest.fn()
    const { getByTestId } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} onOpenPantry={onOpenPantry} />
    )
    fireEvent.press(getByTestId('open-pantry-item'))
    expect(onOpenPantry).toHaveBeenCalledWith('pantry-oats')
  })

  it('tapping the delete button fires onDeletePantry with the item id', () => {
    const onDeletePantry = jest.fn()
    const { getByTestId } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} onDeletePantry={onDeletePantry} />
    )
    fireEvent.press(getByTestId('delete-pantry'))
    expect(onDeletePantry).toHaveBeenCalledWith('pantry-oats')
  })

  it('does not render a delete button when onDeletePantry is not provided', () => {
    const { queryByTestId } = render(
      <PantryPeriodView cycle={cycle} pantry={[oats]} cycleDays={5} />
    )
    expect(queryByTestId('delete-pantry')).toBeNull()
  })
})
