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
  it('shows the product name and the package weight read-only (no input)', () => {
    const { getByText, getByTestId, queryByTestId } = render(<AddItemSheet {...baseProps()} />)
    expect(getByText('Chicken Breast')).toBeTruthy()
    // Weight comes from the database and is shown read-only — there is no
    // editable weight field in product mode (so no keyboard is needed).
    expect(queryByTestId('weight-input')).toBeNull()
    const summary = getByTestId('product-weight').props.children
    expect(summary).toContain('800')
    expect(summary).toContain('880')
  })

  it('adds the item with kcal computed from the package weight', () => {
    const props = baseProps()
    const { getByTestId } = render(<AddItemSheet {...props} />)
    fireEvent.press(getByTestId('add-item-button'))
    expect(props.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Chicken Breast', weightG: 800, kcal: 880, source: 'barcode' })
    )
    expect(props.onClose).toHaveBeenCalled()
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
