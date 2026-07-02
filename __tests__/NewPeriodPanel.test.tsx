import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import NewPeriodPanel from '../src/components/NewPeriodPanel'

// The prep-length control is a gesture-driven RadialDrumPicker; stub it so we can test that
// NewPeriodPanel forwards its onChange to onDaysChange without driving a synthetic PanResponder.
jest.mock('../src/components/RadialDrumPicker', () => {
  const React = require('react')
  const { TouchableOpacity } = require('react-native')
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (n: number) => void }) =>
      React.createElement(TouchableOpacity, { testID: 'day-picker-set', onPress: () => onChange(6) }),
  }
})

function setup(overrides = {}) {
  const props = {
    dayCount: 4,
    startDate: '2026-06-10',
    dailyGoal: 2000,
    onDaysChange: jest.fn(),
    onScanBarcode: jest.fn(),
    onScanReceipt: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<NewPeriodPanel {...props} />) }
}

describe('NewPeriodPanel', () => {
  it('shows the prep length control with pluralization', () => {
    const { getByText } = setup({ dayCount: 4 })
    expect(getByText('Prep length')).toBeTruthy()
    expect(getByText('days')).toBeTruthy()
  })

  it('uses singular for one day', () => {
    const { getByText } = setup({ dayCount: 1 })
    expect(getByText('day')).toBeTruthy()
  })

  it('shows the date range and kcal budget footer', () => {
    const { getByText } = setup({ dayCount: 4, startDate: '2026-06-10', dailyGoal: 2000 })
    // 4 days from 10 Jun → 13 Jun, budget = 4 × 2000 = 8,000
    expect(getByText('10 Jun → 13 Jun · 8,000 kcal budget')).toBeTruthy()
  })

  it('renders both scan cards', () => {
    const { getByTestId, getByText } = setup()
    expect(getByTestId('scan-barcode')).toBeTruthy()
    expect(getByTestId('scan-receipt')).toBeTruthy()
    expect(getByText('Scan a receipt')).toBeTruthy()
    expect(getByText('Scan a barcode')).toBeTruthy()
  })

  it('calls onScanBarcode when the barcode card is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('scan-barcode'))
    expect(props.onScanBarcode).toHaveBeenCalled()
  })

  it('calls onScanReceipt when the receipt card is pressed', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('scan-receipt'))
    expect(props.onScanReceipt).toHaveBeenCalled()
  })

  it('forwards the drum picker value change to onDaysChange', () => {
    const { props, getByTestId } = setup()
    fireEvent.press(getByTestId('day-picker-set'))
    expect(props.onDaysChange).toHaveBeenCalledWith(6)
  })
})
