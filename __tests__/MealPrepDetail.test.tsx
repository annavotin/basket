import React from 'react'
import { render } from '@testing-library/react-native'
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
})
