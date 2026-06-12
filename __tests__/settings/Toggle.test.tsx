import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import Toggle from '../../src/components/settings/Toggle'

describe('Toggle', () => {
  it('reflects value=true in accessibilityState.checked', () => {
    const { getByTestId } = render(
      <Toggle value={true} onValueChange={jest.fn()} testID="my-toggle" />
    )
    expect(getByTestId('my-toggle').props.accessibilityState.checked).toBe(true)
  })

  it('reflects value=false in accessibilityState.checked', () => {
    const { getByTestId } = render(
      <Toggle value={false} onValueChange={jest.fn()} testID="my-toggle" />
    )
    expect(getByTestId('my-toggle').props.accessibilityState.checked).toBe(false)
  })

  it('calls onValueChange with !value when pressed (true → false)', () => {
    const onValueChange = jest.fn()
    const { getByTestId } = render(
      <Toggle value={true} onValueChange={onValueChange} testID="my-toggle" />
    )
    fireEvent.press(getByTestId('my-toggle'))
    expect(onValueChange).toHaveBeenCalledWith(false)
  })

  it('calls onValueChange with !value when pressed (false → true)', () => {
    const onValueChange = jest.fn()
    const { getByTestId } = render(
      <Toggle value={false} onValueChange={onValueChange} testID="my-toggle" />
    )
    fireEvent.press(getByTestId('my-toggle'))
    expect(onValueChange).toHaveBeenCalledWith(true)
  })
})
