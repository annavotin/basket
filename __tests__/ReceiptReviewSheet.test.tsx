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

  it('renders rows as read-only (no inline text inputs)', () => {
    const { queryByTestId } = setup()
    expect(queryByTestId('name-r1')).toBeNull()
    expect(queryByTestId('weight-r1')).toBeNull()
    expect(queryByTestId('kcal-r1')).toBeNull()
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

  it('opens the detail sheet pre-filled when a row is tapped', () => {
    const { getByTestId } = setup()
    fireEvent.press(getByTestId('open-r2')) // Basmati Rice, 1000g, 1300 kcal
    expect(getByTestId('rld-name').props.value).toBe('Basmati Rice')
    expect(getByTestId('rld-weight').props.value).toBe('1000')
    expect(getByTestId('nf-kcal').props.value).toBe('1300')
  })

  it('uses edited name/weight/kcal values in the confirmed item', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r2'))
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('rld-weight'), '500')
    fireEvent.changeText(getByTestId('nf-kcal'), '700')
    fireEvent.press(getByTestId('rld-save'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 500, kcal: 700, source: 'receipt' })
  })

  // Regression: parseInt truncated decimal weight/kcal input (e.g. "127.5" -> 127),
  // same bug class fixed elsewhere on 2026-07-01. Use parseFloat (kcal rounded).
  it('does not truncate decimal weight/kcal input', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r2'))
    fireEvent.changeText(getByTestId('rld-name'), 'Jasmine Rice')
    fireEvent.changeText(getByTestId('rld-weight'), '127.5')
    fireEvent.changeText(getByTestId('nf-kcal'), '164.6')
    fireEvent.press(getByTestId('rld-save'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 127.5, kcal: 165 })
  })

  it('propagates edited macros through to the confirmed item', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r1')) // Chicken Thighs, 1000g, 1770 kcal
    fireEvent.changeText(getByTestId('nf-protein'), '220')
    fireEvent.changeText(getByTestId('nf-carbs'), '0')
    fireEvent.changeText(getByTestId('nf-fat'), '80')
    fireEvent.press(getByTestId('rld-save'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    const chicken = items.find((i: any) => i.name === 'Chicken Thighs')
    expect(chicken.macrosPer100g).toEqual({ protein: 22, carbs: 0, fat: 8 })
  })

  it('discards edits when the detail sheet is cancelled', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('open-r1'))
    fireEvent.changeText(getByTestId('rld-name'), 'Something Else')
    fireEvent.press(getByTestId('rld-cancel'))
    fireEvent.press(getByTestId('confirm-receipt'))
    const items = props.onConfirm.mock.calls[0][0]
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeDefined()
    expect(items.find((i: any) => i.name === 'Something Else')).toBeUndefined()
  })
})
