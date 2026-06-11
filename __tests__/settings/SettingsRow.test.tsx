import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import SettingsRow from '../../src/components/settings/SettingsRow'

describe('SettingsRow', () => {
  it('renders label', () => {
    const { getByText } = render(<SettingsRow label="Display name" />)
    expect(getByText('Display name')).toBeTruthy()
  })

  it('renders sub text when provided', () => {
    const { getByText } = render(<SettingsRow label="Export data" sub="Download a JSON backup" />)
    expect(getByText('Download a JSON backup')).toBeTruthy()
  })

  it('renders value when provided', () => {
    const { getByText } = render(<SettingsRow label="Version" value="1.0.0" />)
    expect(getByText('1.0.0')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <SettingsRow label="Sign out" onPress={onPress} testID="sign-out-row" />
    )
    fireEvent.press(getByTestId('sign-out-row'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <SettingsRow label="Disabled row" onPress={onPress} disabled testID="disabled-row" />
    )
    fireEvent.press(getByTestId('disabled-row'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('renders right prop when provided', () => {
    const { getByText } = render(
      <SettingsRow label="Theme" right={<Text>Custom Right</Text>} />
    )
    expect(getByText('Custom Right')).toBeTruthy()
  })

  it('renders badge when provided', () => {
    const { getByText } = render(<SettingsRow label="Realtime sync" badge="Soon" />)
    expect(getByText('Soon')).toBeTruthy()
  })

  it('applies testID to root view when not pressable', () => {
    const { getByTestId } = render(<SettingsRow label="Version" value="1.0.0" testID="version-row" />)
    expect(getByTestId('version-row')).toBeTruthy()
  })
})
