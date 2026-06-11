import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import Stepper from '../../src/components/settings/Stepper'

describe('Stepper', () => {
  it('renders the current value', () => {
    const { getByText } = render(
      <Stepper value={5} onChange={jest.fn()} testID="my-step" />
    )
    expect(getByText('5')).toBeTruthy()
  })

  it('renders suffix when provided', () => {
    const { getByText } = render(
      <Stepper value={7} suffix=" days" onChange={jest.fn()} testID="my-step" />
    )
    expect(getByText(' days')).toBeTruthy()
  })

  it('calls onChange with value + step when inc is pressed', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Stepper value={5} step={1} onChange={onChange} testID="my-step" />
    )
    fireEvent.press(getByTestId('my-step-inc'))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('calls onChange with value - step when dec is pressed', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Stepper value={5} step={1} onChange={onChange} testID="my-step" />
    )
    fireEvent.press(getByTestId('my-step-dec'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('clamps at min when dec would go below', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Stepper value={0} min={0} step={1} onChange={onChange} testID="my-step" />
    )
    fireEvent.press(getByTestId('my-step-dec'))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('clamps at max when inc would go above', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Stepper value={10} max={10} step={1} onChange={onChange} testID="my-step" />
    )
    fireEvent.press(getByTestId('my-step-inc'))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('respects custom step size', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <Stepper value={100} step={50} onChange={onChange} testID="my-step" />
    )
    fireEvent.press(getByTestId('my-step-inc'))
    expect(onChange).toHaveBeenCalledWith(150)
  })
})
