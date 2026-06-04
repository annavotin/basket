import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ReceiptReviewSheet from '../src/components/ReceiptReviewSheet'
import { getMockReceiptLines } from '../src/mockReceipts'

function setup(overrides = {}) {
  const props = {
    visible: true,
    lines: getMockReceiptLines(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<ReceiptReviewSheet {...props} />) }
}

describe('ReceiptReviewSheet', () => {
  it('renders a row per line', () => {
    const { getAllByTestId } = setup()
    expect(getAllByTestId(/^receipt-row-/).length).toBe(getMockReceiptLines().length)
  })

  it('confirms only food lines by default (non-food excluded) as receipt-sourced items', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(4) // 4 food, TOTAL excluded
    expect(items.every((i: any) => i.source === 'receipt')).toBe(true)
    expect(items.find((i: any) => i.name === 'TOTAL £14.20')).toBeUndefined()
    expect(props.onClose).toHaveBeenCalled()
  })

  it('excludes a food line when its toggle is turned off', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('toggle-r1')) // turn off Chicken Thighs
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(3)
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeUndefined()
  })

  it('includes a non-food line when its toggle is turned on', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('toggle-r5')) // turn on TOTAL line
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(5)
  })

  it('uses edited name/weight/kcal values in the confirmed item', () => {
    const { props, getByTestId } = setup()
    fireEvent.changeText(getByTestId('name-r2'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('weight-r2'), '500')
    fireEvent.changeText(getByTestId('kcal-r2'), '650')
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 500, kcal: 650, source: 'receipt' })
  })
})
