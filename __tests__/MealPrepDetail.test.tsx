import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import MealPrepDetail from '../src/components/MealPrepDetail'
import { cycles } from '../src/data'
import { PantryItem, MealPrepCycle } from '../src/types'

const oats: PantryItem = {
  id: 'pantry-oats',
  name: 'Oats',
  emoji: '🌾',
  kcalPer100g: 379,
  dailyG: 40,
}

const cycleNoPantryOverrides: MealPrepCycle = {
  id: 'test-cycle',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  items: [],
}

describe('MealPrepDetail', () => {
  it('renders nothing when activeCycle is null', () => {
    const { toJSON } = render(<MealPrepDetail activeCycle={null} />)
    expect(toJSON()).toBeNull()
  })

  it('renders an item card for each food item', () => {
    const { getAllByTestId } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getAllByTestId('food-item')).toHaveLength(cycles[0].items.length)
  })

  it('displays the food item name', () => {
    const { getByText } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getByText('Broccoli')).toBeTruthy()
  })

  it('displays weight and kcal', () => {
    const { getByText } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getByText('600g  204kcal')).toBeTruthy()
  })

  it('calls onRemoveItem with the index of the tapped card', () => {
    const onRemoveItem = jest.fn()
    const { getAllByTestId } = render(
      <MealPrepDetail activeCycle={cycles[0]} onRemoveItem={onRemoveItem} />
    )
    const removeButtons = getAllByTestId('remove-item')
    expect(removeButtons).toHaveLength(cycles[0].items.length)
    // Tap the third card (index 2) and assert the index is forwarded.
    fireEvent.press(removeButtons[2])
    expect(onRemoveItem).toHaveBeenCalledWith(2)
  })

  it('renders a remove control per card', () => {
    const { getAllByTestId } = render(<MealPrepDetail activeCycle={cycles[0]} />)
    expect(getAllByTestId('remove-item')).toHaveLength(cycles[0].items.length)
  })

  it('shows a ×N badge and quantity-multiplied calories', () => {
    const cycle = {
      id: 'c', startDate: '2026-06-01', endDate: '2026-06-04',
      items: [{ name: 'Chicken', weightG: 200, kcal: 220, emoji: '🍗', quantity: 3 }],
    }
    const { getByText } = render(<MealPrepDetail activeCycle={cycle} />)
    getByText(/×3/)
    getByText(/660kcal/)
    getByText(/200g/)
  })

  it('calls onEditItem with the index of the tapped info area', () => {
    const onEditItem = jest.fn()
    const { getAllByTestId } = render(
      <MealPrepDetail activeCycle={cycles[0]} onEditItem={onEditItem} />
    )
    const editButtons = getAllByTestId('edit-item')
    expect(editButtons).toHaveLength(cycles[0].items.length)
    // Tap the second card (index 1) and assert the index is forwarded.
    fireEvent.press(editButtons[1])
    expect(onEditItem).toHaveBeenCalledWith(1)
  })

  describe('pantry section', () => {
    it('renders grams and kcal for a pantry item with no override (40×5=200g, 758kcal)', () => {
      const { getByTestId, getByText, getAllByTestId } = render(
        <MealPrepDetail
          activeCycle={cycleNoPantryOverrides}
          pantry={[oats]}
          cycleDays={5}
        />
      )
      expect(getByTestId('pantry-section')).toBeTruthy()
      expect(getAllByTestId('pantry-detail-row')).toHaveLength(1)
      const input = getByTestId('pantry-grams')
      expect(input.props.value).toBe('200')
      expect(getByText('758 kcal')).toBeTruthy()
    })

    it('fires onSetPantryGrams with item id and parsed number when input changes', () => {
      const onSetPantryGrams = jest.fn()
      const { getByTestId } = render(
        <MealPrepDetail
          activeCycle={cycleNoPantryOverrides}
          pantry={[oats]}
          cycleDays={5}
          onSetPantryGrams={onSetPantryGrams}
        />
      )
      fireEvent.changeText(getByTestId('pantry-grams'), '150')
      expect(onSetPantryGrams).toHaveBeenCalledWith('pantry-oats', 150)
    })

    it('shows overridden grams from pantryOverrides', () => {
      const cycleWithOverride: MealPrepCycle = {
        ...cycleNoPantryOverrides,
        pantryOverrides: { 'pantry-oats': 120 },
      }
      const { getByTestId } = render(
        <MealPrepDetail
          activeCycle={cycleWithOverride}
          pantry={[oats]}
          cycleDays={5}
        />
      )
      expect(getByTestId('pantry-grams').props.value).toBe('120')
    })

    it('does not render pantry section when pantry is empty', () => {
      const { queryByTestId } = render(
        <MealPrepDetail activeCycle={cycleNoPantryOverrides} pantry={[]} cycleDays={5} />
      )
      expect(queryByTestId('pantry-section')).toBeNull()
    })

    it('does not render pantry section when pantry prop is omitted', () => {
      const { queryByTestId } = render(
        <MealPrepDetail activeCycle={cycleNoPantryOverrides} cycleDays={5} />
      )
      expect(queryByTestId('pantry-section')).toBeNull()
    })
  })
})
