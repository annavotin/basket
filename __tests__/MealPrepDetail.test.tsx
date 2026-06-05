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
})
