import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ReceiptLineDetail from '../src/components/ReceiptLineDetail'

const LINE = { id: 'r2', name: 'Basmati Rice', weightG: 1000, kcalPer100g: 130, macrosPer100g: undefined }

function setup(overrides = {}) {
  const props = {
    visible: true,
    line: LINE,
    onSave: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<ReceiptLineDetail {...props} />) }
}

describe('ReceiptLineDetail', () => {
  it('pre-fills name, weight, and total calories from the draft line', () => {
    const { getByTestId } = setup()
    expect(getByTestId('rld-name').props.value).toBe('Basmati Rice')
    expect(getByTestId('rld-weight').props.value).toBe('1000')
    expect(getByTestId('nf-kcal').props.value).toBe('1300') // 130 kcal/100g over 1000g, basis=total
  })

  it('shows the macros section as estimated when the line has no macros', () => {
    const { getByText } = setup()
    expect(getByText('Macros · estimated')).toBeTruthy()
  })

  it('does not show the estimated hint once macros are present', () => {
    const { queryByText } = setup({ line: { ...LINE, macrosPer100g: { protein: 10, carbs: 20, fat: 5 } } })
    expect(queryByText('Macros · estimated')).toBeNull()
  })

  it('calls onSave with edited values and closes on Save', () => {
    const { props, getByTestId } = setup()
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('rld-weight'), '500')
    fireEvent.press(getByTestId('rld-save'))
    expect(props.onSave).toHaveBeenCalledWith('r2', {
      name: 'Jasmine Rice',
      weightG: 500,
      kcalPer100g: 130,
      macrosPer100g: undefined,
    })
    expect(props.onClose).toHaveBeenCalled()
  })

  it('calls onClose without onSave on Cancel', () => {
    const { props, getByTestId } = setup()
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.press(getByTestId('rld-cancel'))
    expect(props.onSave).not.toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalled()
  })

  it('renders nothing when line is null', () => {
    const { queryByTestId } = setup({ line: null })
    expect(queryByTestId('receipt-line-detail')).toBeNull()
  })
})
