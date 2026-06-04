import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import AddItemSheet from '../src/components/AddItemSheet'
import { MOCK_PRODUCTS } from '../src/mockProducts'

const product = MOCK_PRODUCTS[0] // Chicken Breast, 800g, 110 kcal/100g

function baseProps(overrides = {}) {
  return {
    visible: true,
    product,
    onAdd: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
}

describe('AddItemSheet (product confirm mode)', () => {
  it('shows the product name and defaults weight to the package size', () => {
    const { getByText, getByTestId } = render(<AddItemSheet {...baseProps()} />)
    expect(getByText('Chicken Breast')).toBeTruthy()
    expect(getByTestId('weight-input').props.value).toBe('800')
  })

  it('adds the item with kcal computed from the default package weight', () => {
    const props = baseProps()
    const { getByTestId } = render(<AddItemSheet {...props} />)
    fireEvent.press(getByTestId('add-item-button'))
    expect(props.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Chicken Breast', weightG: 800, kcal: 880, source: 'barcode' })
    )
    expect(props.onClose).toHaveBeenCalled()
  })

  it('recomputes kcal when the weight is edited', () => {
    const props = baseProps()
    const { getByTestId } = render(<AddItemSheet {...props} />)
    fireEvent.changeText(getByTestId('weight-input'), '200')
    fireEvent.press(getByTestId('add-item-button'))
    expect(props.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ weightG: 200, kcal: 220 })
    )
  })
})

describe('AddItemSheet (manual mode)', () => {
  it('adds a manual item from the entered fields', () => {
    const props = baseProps({ product: null })
    const { getByTestId } = render(<AddItemSheet {...props} />)
    fireEvent.changeText(getByTestId('manual-name-input'), 'Protein Bar')
    fireEvent.changeText(getByTestId('weight-input'), '60')
    fireEvent.changeText(getByTestId('manual-kcal-input'), '220')
    fireEvent.press(getByTestId('add-item-button'))
    expect(props.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Protein Bar', weightG: 60, kcal: 220, source: 'manual' })
    )
  })
})
