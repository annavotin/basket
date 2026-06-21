import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import MealPrepDetail from '../src/components/MealPrepDetail'
import { cycles } from '../src/data'

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
    expect(getByText('600 g · 204 kcal')).toBeTruthy()
  })

  it('shows a ×N badge and quantity-multiplied calories', () => {
    const cycle = {
      id: 'c', startDate: '2026-06-01', endDate: '2026-06-04',
      items: [{ name: 'Chicken', weightG: 200, kcal: 220, emoji: '🍗', quantity: 3 }],
    }
    const { getByText } = render(<MealPrepDetail activeCycle={cycle} />)
    getByText(/×3/)
    getByText(/660 kcal/)
    getByText(/200 g/)
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
})
