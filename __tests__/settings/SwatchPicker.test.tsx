import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import SwatchPicker from '../../src/components/settings/SwatchPicker'

const options: [string, string, string][] = [
  ['#7CC96E', '#5FB152', '#3E8F38'],
  ['#E6A23C', '#D98A1F', '#B5710F'],
  ['#5FA8D3', '#3E8BBE', '#2C6E9C'],
]

describe('SwatchPicker', () => {
  it('marks selected swatch as selected', () => {
    const { getByTestId } = render(
      <SwatchPicker
        value={['#7CC96E', '#5FB152', '#3E8F38']}
        options={options}
        onChange={jest.fn()}
        testID="accent"
      />
    )
    expect(getByTestId('accent-0').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('accent-1').props.accessibilityState.selected).toBe(false)
    expect(getByTestId('accent-2').props.accessibilityState.selected).toBe(false)
  })

  it('calls onChange with the correct triple when pressing a swatch', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <SwatchPicker
        value={['#7CC96E', '#5FB152', '#3E8F38']}
        options={options}
        onChange={onChange}
        testID="accent"
      />
    )
    fireEvent.press(getByTestId('accent-1'))
    expect(onChange).toHaveBeenCalledWith(['#E6A23C', '#D98A1F', '#B5710F'])
  })

  it('calls onChange with the third option triple when pressing index 2', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <SwatchPicker
        value={['#7CC96E', '#5FB152', '#3E8F38']}
        options={options}
        onChange={onChange}
        testID="accent"
      />
    )
    fireEvent.press(getByTestId('accent-2'))
    expect(onChange).toHaveBeenCalledWith(['#5FA8D3', '#3E8BBE', '#2C6E9C'])
  })

  it('renders all swatches', () => {
    const { getByTestId } = render(
      <SwatchPicker
        value={options[0]}
        options={options}
        onChange={jest.fn()}
        testID="accent"
      />
    )
    expect(getByTestId('accent-0')).toBeTruthy()
    expect(getByTestId('accent-1')).toBeTruthy()
    expect(getByTestId('accent-2')).toBeTruthy()
  })
})
