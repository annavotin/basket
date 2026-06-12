import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import SettingsSection from '../../src/components/settings/SettingsSection'

describe('SettingsSection', () => {
  it('renders label and children', () => {
    const { getByText } = render(
      <SettingsSection label="Profile">
        <Text>Child content</Text>
      </SettingsSection>
    )
    expect(getByText('Profile')).toBeTruthy()
    expect(getByText('Child content')).toBeTruthy()
  })

  it('renders hint when provided', () => {
    const { getByText } = render(
      <SettingsSection label="Goals" hint="Your daily budget sets the target.">
        <Text>Child</Text>
      </SettingsSection>
    )
    expect(getByText('Your daily budget sets the target.')).toBeTruthy()
  })

  it('does not render hint element when hint is not provided', () => {
    const { queryByText } = render(
      <SettingsSection label="Units">
        <Text>Child</Text>
      </SettingsSection>
    )
    expect(queryByText(/budget/)).toBeNull()
  })
})
