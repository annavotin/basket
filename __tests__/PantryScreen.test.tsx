import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import PantryScreen from '../src/components/PantryScreen'
import { PantryItem } from '../src/types'

const samplePantry: PantryItem[] = [
  { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 },
  { id: 'pantry-eggs', name: 'Eggs', emoji: '🥚', kcalPer100g: 155, dailyG: 60 },
]

function renderScreen(overrides?: Partial<React.ComponentProps<typeof PantryScreen>>) {
  const defaults = {
    visible: true,
    pantry: samplePantry,
    onAdd: jest.fn(),
    onRemove: jest.fn(),
    onClose: jest.fn(),
  }
  return render(<PantryScreen {...defaults} {...overrides} />)
}

describe('PantryScreen', () => {
  it('renders a row for each pantry item', () => {
    const { getAllByTestId } = renderScreen()
    expect(getAllByTestId('pantry-row')).toHaveLength(2)
  })

  it('shows item name and meta in each row', () => {
    const { getByText } = renderScreen()
    expect(getByText('🌾 Oats')).toBeTruthy()
    expect(getByText('40 g/day · 379 kcal/100g')).toBeTruthy()
    expect(getByText('🥚 Eggs')).toBeTruthy()
    expect(getByText('60 g/day · 155 kcal/100g')).toBeTruthy()
  })

  it('calls onRemove with the item id when remove button is tapped', () => {
    const onRemove = jest.fn()
    const { getAllByTestId } = renderScreen({ onRemove })
    fireEvent.press(getAllByTestId('pantry-remove')[0])
    expect(onRemove).toHaveBeenCalledWith('pantry-oats')
  })

  it('Add button is disabled when all fields are empty', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Add button is disabled when name is filled but numbers are missing', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.changeText(getByTestId('pantry-name-input'), 'Almonds')
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Add button is disabled when kcal is zero', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.changeText(getByTestId('pantry-name-input'), 'Almonds')
    fireEvent.changeText(getByTestId('pantry-kcal-input'), '0')
    fireEvent.changeText(getByTestId('pantry-grams-input'), '30')
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('filling all fields and pressing Add emits the correct draft and clears the form', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.changeText(getByTestId('pantry-name-input'), 'Almonds')
    fireEvent.changeText(getByTestId('pantry-kcal-input'), '579')
    fireEvent.changeText(getByTestId('pantry-grams-input'), '30')
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).toHaveBeenCalledWith({ name: 'Almonds', kcalPer100g: 579, dailyG: 30 })
    // form clears
    expect(getByTestId('pantry-name-input').props.value).toBe('')
    expect(getByTestId('pantry-kcal-input').props.value).toBe('')
    expect(getByTestId('pantry-grams-input').props.value).toBe('')
  })

  it('calls onClose when Close button is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderScreen({ onClose })
    fireEvent.press(getByTestId('pantry-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders empty list when pantry is empty', () => {
    const { queryAllByTestId } = renderScreen({ pantry: [] })
    expect(queryAllByTestId('pantry-row')).toHaveLength(0)
  })
})
