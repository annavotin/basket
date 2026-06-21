import React from 'react'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'

jest.mock('../src/services/foodApi', () => ({
  searchProductsByName: jest.fn().mockResolvedValue([]),
}))

import AddItemSheet from '../src/components/AddItemSheet'
import { Product } from '../src/mockProducts'

const product: Product = { name: 'Nutella', emoji: '🍫', packageWeightG: 400, kcalPer100g: 539 }

describe('AddItemSheet — scanned mode', () => {
  it('prefills the editable weight and emits quantity + per-unit kcal', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={product} onAdd={onAdd} onClose={() => {}} />
    )
    const weight = getByTestId('weight-input')
    expect(weight.props.value).toBe('400')
    fireEvent.changeText(weight, '200')
    fireEvent.press(getByTestId('qty-inc'))
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nutella', weightG: 200, kcal: 1078, quantity: 2, source: 'barcode',
      })
    )
  })
})

describe('AddItemSheet — manual mode', () => {
  it('autofills name + kcal from a tapped local suggestion', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    fireEvent.changeText(getByTestId('weight-input'), '120')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Banana', weightG: 120, kcal: 107, quantity: 1, source: 'manual',
      })
    )
  })

  it('shows a calories-per-100g field for a free item with no match and uses it', () => {
    const onAdd = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Grandmas Stew')
    const per100 = getByTestId('kcal-per-100g-input')
    expect(per100).toBeTruthy()
    fireEvent.changeText(per100, '150')
    fireEvent.changeText(getByTestId('weight-input'), '300')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Grandmas Stew', weightG: 300, kcal: 450, quantity: 1 })
    )
    expect(queryByTestId('manual-kcal-input')).toBeNull()
  })

  it('hides the kcal preview until weight & calories are entered', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Plain Item')
    expect(queryByTestId('kcal-preview')).toBeNull()
  })
})

describe('AddItemSheet — validation guard', () => {
  it('does not add when weight is empty, and adds once weight is set', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    fireEvent.press(getByTestId('add-item-button')) // weight still empty -> guarded
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('kcal-per-100g-input'), '80')
    fireEvent.changeText(getByTestId('weight-input'), '250')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mystery Soup', weightG: 250, kcal: 200, quantity: 1 })
    )
  })
})

it('passes the product macrosPer100g onto the added item', () => {
  const onAdd = jest.fn()
  const product = { name: 'Yogurt', emoji: '🥛', packageWeightG: 500, kcalPer100g: 59, macrosPer100g: { protein: 10, carbs: 4, fat: 0.4 } }
  const { getByText } = render(
    <ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>
      <AddItemSheet visible product={product} onAdd={onAdd} onClose={() => {}} />
    </ThemeProvider>
  )
  fireEvent.press(getByText('Add to period'))
  expect(onAdd.mock.calls[0][0].macrosPer100g).toEqual({ protein: 10, carbs: 4, fat: 0.4 })
})
