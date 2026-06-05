import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import NewPeriodPanel from '../src/components/NewPeriodPanel'

function setup(overrides = {}) {
  const props = {
    dayCount: 4,
    onDaysChange: jest.fn(),
    onScanBarcode: jest.fn(),
    onScanReceipt: jest.fn(),
    onAddManual: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<NewPeriodPanel {...props} />) }
}

describe('NewPeriodPanel', () => {
  it('renders the New shop title', () => {
    const { getByText } = setup()
    expect(getByText('New shop')).toBeTruthy()
  })

  it('shows the day count with correct pluralization', () => {
    const { getByText } = setup({ dayCount: 4 })
    expect(getByText('4 days')).toBeTruthy()
  })

  it('uses singular for one day', () => {
    const { getByText } = setup({ dayCount: 1 })
    expect(getByText('1 day')).toBeTruthy()
  })

  it('renders both scan buttons', () => {
    const { getByTestId } = setup()
    expect(getByTestId('scan-barcode')).toBeTruthy()
    expect(getByTestId('scan-receipt')).toBeTruthy()
  })

  it('calls onScanBarcode when the barcode button is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('scan-barcode'))
    expect(props.onScanBarcode).toHaveBeenCalled()
  })

  it('calls onScanReceipt when the receipt button is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('scan-receipt'))
    expect(props.onScanReceipt).toHaveBeenCalled()
  })

  it('calls onDaysChange (rounded) when the slider value changes', () => {
    const { props, getByTestId } = setup()
    fireEvent(getByTestId('day-slider'), 'valueChange', 6)
    expect(props.onDaysChange).toHaveBeenCalledWith(6)
  })

  it('fires onAddManual when the manual-add control is pressed', () => {
    const onAddManual = jest.fn()
    const { getByTestId } = render(
      <NewPeriodPanel dayCount={4} onDaysChange={() => {}} onScanBarcode={() => {}}
        onScanReceipt={() => {}} onAddManual={onAddManual} />
    )
    fireEvent.press(getByTestId('manual-add'))
    expect(onAddManual).toHaveBeenCalled()
  })
})
