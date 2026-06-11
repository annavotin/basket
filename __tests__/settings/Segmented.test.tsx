import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import Segmented from '../../src/components/settings/Segmented'

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
]

describe('Segmented', () => {
  it('marks active option as selected', () => {
    const { getByTestId } = render(
      <Segmented value="dark" options={options} onChange={jest.fn()} testID="theme-seg" />
    )
    expect(getByTestId('theme-seg-dark').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('theme-seg-light').props.accessibilityState.selected).toBe(false)
    expect(getByTestId('theme-seg-system').props.accessibilityState.selected).toBe(false)
  })

  it('calls onChange with the selected value when pressing a segment', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Segmented value="light" options={options} onChange={onChange} testID="theme-seg" />
    )
    fireEvent.press(getByTestId('theme-seg-dark'))
    expect(onChange).toHaveBeenCalledWith('dark')
  })

  it('calls onChange when pressing the currently active segment', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Segmented value="light" options={options} onChange={onChange} testID="theme-seg" />
    )
    fireEvent.press(getByTestId('theme-seg-light'))
    expect(onChange).toHaveBeenCalledWith('light')
  })

  it('renders all option labels', () => {
    const { getByText } = render(
      <Segmented value="light" options={options} onChange={jest.fn()} />
    )
    expect(getByText('Light')).toBeTruthy()
    expect(getByText('Dark')).toBeTruthy()
    expect(getByText('Auto')).toBeTruthy()
  })
})
