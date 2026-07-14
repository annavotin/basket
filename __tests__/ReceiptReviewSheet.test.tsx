import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ReceiptReviewSheet from '../src/components/ReceiptReviewSheet'
import { getMockReceiptLines } from '../src/mockReceipts'

function setup(overrides = {}) {
  const props = {
    visible: true,
    lines: getMockReceiptLines(),
    days: 7,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<ReceiptReviewSheet {...props} />) }
}

// Rows open the shared ItemDetail in view mode; Edit reveals the editable fields.
function openAndEdit(utils: ReturnType<typeof setup>, id: string) {
  fireEvent.press(utils.getByTestId(`open-${id}`))
  fireEvent.press(utils.getByText('Edit'))
}

describe('ReceiptReviewSheet', () => {
  it('renders a row per line', () => {
    const { getAllByTestId } = setup()
    expect(getAllByTestId(/^receipt-row-/).length).toBe(getMockReceiptLines().length)
  })

  // Receipts rarely print pack sizes, so weight is the one field editable right on the
  // row; name/kcal edits go through the detail sheet.
  it('rows expose an inline weight input but no name/kcal inputs', () => {
    const { queryByTestId, getByTestId } = setup()
    expect(getByTestId('weight-r1').props.value).toBe('1000')
    expect(queryByTestId('name-r1')).toBeNull()
    expect(queryByTestId('kcal-r1')).toBeNull()
  })

  it('editing the inline weight rescales kcal at the scanned density', () => {
    const utils = setup()
    fireEvent.changeText(utils.getByTestId('weight-r2'), '500') // rice scanned at 130 kcal/100g
    expect(utils.getByText('650 kcal')).toBeTruthy()
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Basmati Rice')
    expect(rice).toMatchObject({ weightG: 500, kcal: 650 })
  })

  it('keeps decimal inline weights without truncating', () => {
    const utils = setup()
    fireEvent.changeText(utils.getByTestId('weight-r2'), '127.5')
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Basmati Rice')
    expect(rice).toMatchObject({ weightG: 127.5, kcal: 166 }) // round(130 * 1.275)
  })

  it('opens the detail sheet with an inline-edited weight', () => {
    const utils = setup()
    fireEvent.changeText(utils.getByTestId('weight-r2'), '500')
    openAndEdit(utils, 'r2')
    expect(utils.getByTestId('id-weight').props.value).toBe('500')
    expect(utils.getByTestId('nf-kcal').props.value).toBe('650')
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

  it('opens ItemDetail pre-filled when a row is tapped (total-basis kcal)', () => {
    const utils = setup()
    openAndEdit(utils, 'r2') // Basmati Rice, 1000g, 1300 kcal
    expect(utils.getByTestId('id-name').props.value).toBe('Basmati Rice')
    expect(utils.getByTestId('id-weight').props.value).toBe('1000')
    // basis starts at 'total': 130 kcal/100g over 1000g shows as 1300
    expect(utils.getByTestId('nf-kcal').props.value).toBe('1300')
  })

  it('uses edited name/weight/kcal values in the confirmed item', () => {
    const utils = setup()
    openAndEdit(utils, 'r2')
    fireEvent.changeText(utils.getByTestId('id-name'), 'Jasmine Rice')
    fireEvent.changeText(utils.getByTestId('id-weight'), '500')
    fireEvent.changeText(utils.getByTestId('nf-kcal'), '700')
    fireEvent.press(utils.getByText('Save'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 500, kcal: 700, source: 'receipt' })
  })

  // Regression guard from 2026-07-01: decimal input must not be *truncated*.
  // ItemDetail rounds weight to whole grams on save (127.5 -> 128, not 127),
  // and kcal comes back via kcalForWeight (129.1/100g over 128g -> 165).
  it('does not truncate decimal weight/kcal input', () => {
    const utils = setup()
    openAndEdit(utils, 'r2')
    fireEvent.changeText(utils.getByTestId('id-name'), 'Jasmine Rice')
    fireEvent.changeText(utils.getByTestId('id-weight'), '127.5')
    fireEvent.changeText(utils.getByTestId('nf-kcal'), '164.6')
    fireEvent.press(utils.getByText('Save'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const rice = items.find((i: any) => i.name === 'Jasmine Rice')
    expect(rice).toMatchObject({ weightG: 128, kcal: 165 })
  })

  it('propagates edited macros through to the confirmed item', () => {
    const utils = setup()
    openAndEdit(utils, 'r1') // Chicken Thighs, 1000g, 1770 kcal
    fireEvent.changeText(utils.getByTestId('nf-protein'), '220')
    fireEvent.changeText(utils.getByTestId('nf-carbs'), '0')
    fireEvent.changeText(utils.getByTestId('nf-fat'), '80')
    fireEvent.press(utils.getByText('Save'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const chicken = items.find((i: any) => i.name === 'Chicken Thighs')
    expect(chicken.macrosPer100g).toEqual({ protein: 22, carbs: 0, fat: 8 })
  })

  it('carries an edited quantity into the confirmed item and the row meta', () => {
    const utils = setup()
    openAndEdit(utils, 'r3') // Spinach, 200g, 46 kcal
    fireEvent.press(utils.getByTestId('id-qty-inc'))
    fireEvent.press(utils.getByText('Save'))
    expect(utils.getByText('2 × 46 kcal')).toBeTruthy() // per-unit kcal with the multiplier, like ItemDetail's "2 × 200 g"
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    const spinach = items.find((i: any) => i.name === 'Spinach')
    expect(spinach).toMatchObject({ weightG: 200, kcal: 46, quantity: 2 })
  })

  it('discards edits when editing is cancelled', () => {
    const utils = setup()
    openAndEdit(utils, 'r1')
    fireEvent.changeText(utils.getByTestId('id-name'), 'Something Else')
    fireEvent.press(utils.getByTestId('id-cancel-edit'))
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeDefined()
    expect(items.find((i: any) => i.name === 'Something Else')).toBeUndefined()
  })

  it('unchecks the row when Remove from basket is confirmed', () => {
    const utils = setup()
    fireEvent.press(utils.getByTestId('open-r1'))
    fireEvent.press(utils.getByText('Remove from basket'))
    fireEvent.press(utils.getByText('Delete')) // ItemDetail's built-in confirm
    expect(utils.getByTestId('receipt-row-r1')).toBeTruthy() // row stays, just excluded
    fireEvent.press(utils.getByTestId('confirm-receipt'))
    const items = utils.props.onConfirm.mock.calls[0][0]
    expect(items).toHaveLength(3)
    expect(items.find((i: any) => i.name === 'Chicken Thighs')).toBeUndefined()
  })
})
