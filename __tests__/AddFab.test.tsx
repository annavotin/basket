import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import AddFab from '../src/components/AddFab'

function setup(overrides = {}) {
  const props = { onScanBarcode: jest.fn(), onScanReceipt: jest.fn(), onAddManual: jest.fn(), ...overrides }
  return { props, ...render(<AddFab {...props} />) }
}

describe('AddFab', () => {
  it('hides the options until opened', () => {
    const { queryByTestId } = setup()
    expect(queryByTestId('fab-barcode')).toBeNull()
    expect(queryByTestId('fab-receipt')).toBeNull()
  })

  it('reveals options when the fab is pressed', () => {
    const { getByTestId } = setup()
    fireEvent.press(getByTestId('add-fab'))
    expect(getByTestId('fab-barcode')).toBeTruthy()
    expect(getByTestId('fab-receipt')).toBeTruthy()
  })

  it('calls onScanBarcode and closes when the barcode option is pressed', () => {
    const { props, getByTestId, queryByTestId } = setup()
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.press(getByTestId('fab-barcode'))
    expect(props.onScanBarcode).toHaveBeenCalled()
    expect(queryByTestId('fab-barcode')).toBeNull() // closed after choosing
  })

  it('calls onScanReceipt when the receipt option is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.press(getByTestId('fab-receipt'))
    expect(props.onScanReceipt).toHaveBeenCalled()
  })

  it('fires onAddManual from the manual option', () => {
    const onAddManual = jest.fn()
    const { getByTestId } = render(
      <AddFab onScanBarcode={() => {}} onScanReceipt={() => {}} onAddManual={onAddManual} />
    )
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.press(getByTestId('fab-manual'))
    expect(onAddManual).toHaveBeenCalled()
  })

  it('in manualOnly mode, pressing the fab calls onAddManual directly with no menu', () => {
    const onAddManual = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddFab manualOnly onAddManual={onAddManual} />
    )
    fireEvent.press(getByTestId('add-fab'))
    expect(onAddManual).toHaveBeenCalled()
    expect(queryByTestId('fab-barcode')).toBeNull()
    expect(queryByTestId('fab-receipt')).toBeNull()
    expect(queryByTestId('fab-manual')).toBeNull()
  })
})
