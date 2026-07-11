import React, { useState } from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import SettingsScreen from '../src/components/SettingsScreen'
import { Preferences } from '../src/types'
import { Account } from '../src/services/auth'

const DEFAULT_PREFS: Preferences = {
  name: 'Anna',
  defaultDays: 4,
  units: { weight: 'g', energy: 'kcal' },
  theme: 'system',
  accent: ['#7CC96E', '#5FB152', '#3E8F38'],
  macroTargets: { protein: 50, carbs: 200, fat: 70 },
  nutritionBasis: 'per100g',
}

function renderSettings(overrides?: Partial<Parameters<typeof SettingsScreen>[0]>) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    prefs: DEFAULT_PREFS,
    setPrefs: jest.fn(),
    dailyGoal: 2000,
    onDailyGoal: jest.fn(),
    onExport: jest.fn(),
    onClearAll: jest.fn(),
    ...overrides,
  }
  return render(<SettingsScreen {...props} />)
}

describe('SettingsScreen', () => {
  it('renders the settings screen container', () => {
    const { getByTestId } = renderSettings()
    expect(getByTestId('settings-screen')).toBeTruthy()
  })

  it('shows all section labels', () => {
    const { getByText } = renderSettings()
    // The display-name row's section label was intentionally emptied (no "Profile" heading).
    expect(getByText('Goals')).toBeTruthy()
    expect(getByText('Meal prep')).toBeTruthy()
    expect(getByText('Units')).toBeTruthy()
    expect(getByText('Appearance')).toBeTruthy()
  })

  it('calls onClose when back button is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderSettings({ onClose })
    fireEvent.press(getByTestId('settings-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('editing settings-name-input calls setPrefs', () => {
    const setPrefs = jest.fn()
    const { getByTestId } = renderSettings({ setPrefs })
    fireEvent.changeText(getByTestId('settings-name-input'), 'Bob')
    expect(setPrefs).toHaveBeenCalled()
    // Verify the updater function produces the correct value
    const updater = setPrefs.mock.calls[0][0]
    const result = updater(DEFAULT_PREFS)
    expect(result.name).toBe('Bob')
  })

  it('pressing daily-goal-inc calls onDailyGoal with goal + step', () => {
    const onDailyGoal = jest.fn()
    const { getByTestId } = renderSettings({ dailyGoal: 2000, onDailyGoal })
    fireEvent.press(getByTestId('daily-goal-inc'))
    expect(onDailyGoal).toHaveBeenCalledWith(2050)
  })

  it('pressing daily-goal-dec calls onDailyGoal with goal - step', () => {
    const onDailyGoal = jest.fn()
    const { getByTestId } = renderSettings({ dailyGoal: 2000, onDailyGoal })
    fireEvent.press(getByTestId('daily-goal-dec'))
    expect(onDailyGoal).toHaveBeenCalledWith(1950)
  })

  it('shows goal in kJ when energy unit is kJ', () => {
    const kjPrefs: Preferences = {
      ...DEFAULT_PREFS,
      units: { weight: 'g', energy: 'kJ' },
    }
    const { getByText } = renderSettings({ prefs: kjPrefs, dailyGoal: 2000 })
    // 2000 kcal * 4.184 = 8368 kJ
    expect(getByText('8368')).toBeTruthy()
  })

  it('in kJ mode, pressing inc converts back to kcal', () => {
    const onDailyGoal = jest.fn()
    const kjPrefs: Preferences = {
      ...DEFAULT_PREFS,
      units: { weight: 'g', energy: 'kJ' },
    }
    const { getByTestId } = renderSettings({ prefs: kjPrefs, dailyGoal: 2000, onDailyGoal })
    fireEvent.press(getByTestId('daily-goal-inc'))
    // 8368 kJ + 100 = 8468 kJ; 8468 / 4.184 ≈ 2024 kcal
    const calledWith = onDailyGoal.mock.calls[0][0]
    expect(typeof calledWith).toBe('number')
    // The value should be around 2024 kcal
    expect(calledWith).toBeCloseTo(2024, -1)
  })

  it('switching theme calls setPrefs', () => {
    const setPrefs = jest.fn()
    const { getByTestId } = renderSettings({ setPrefs })
    fireEvent.press(getByTestId('theme-dark'))
    expect(setPrefs).toHaveBeenCalled()
    const updater = setPrefs.mock.calls[0][0]
    const result = updater(DEFAULT_PREFS)
    expect(result.theme).toBe('dark')
  })

  it('theme change re-renders with new value (controlled wrapper)', () => {
    function Wrapper() {
      const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
      return (
        <SettingsScreen
          visible={true}
          onClose={() => {}}
          prefs={prefs}
          setPrefs={setPrefs}
          dailyGoal={2000}
          onDailyGoal={() => {}}
          onExport={() => {}}
          onClearAll={() => {}}
        />
      )
    }
    const { getByTestId } = render(<Wrapper />)
    fireEvent.press(getByTestId('theme-dark'))
    // After re-render, theme-dark should be selected (accessibilityState.selected = true)
    expect(getByTestId('theme-dark').props.accessibilityState?.selected).toBe(true)
  })

  it('macro steppers call setPrefs with updated macroTargets', () => {
    const setPrefs = jest.fn()
    const { getByTestId } = renderSettings({ setPrefs })

    fireEvent.press(getByTestId('macro-protein-inc'))
    const updater = setPrefs.mock.calls[0][0]
    const result = updater(DEFAULT_PREFS)
    expect(result.macroTargets.protein).toBe(55)
  })

  it('default-days stepper calls setPrefs', () => {
    const setPrefs = jest.fn()
    const { getByTestId } = renderSettings({ setPrefs })
    fireEvent.press(getByTestId('default-days-inc'))
    expect(setPrefs).toHaveBeenCalled()
    const updater = setPrefs.mock.calls[0][0]
    const result = updater(DEFAULT_PREFS)
    expect(result.defaultDays).toBe(5)
  })

  it('units-weight segmented calls setPrefs with oz', () => {
    const setPrefs = jest.fn()
    const { getByTestId } = renderSettings({ setPrefs })
    fireEvent.press(getByTestId('units-weight-oz'))
    expect(setPrefs).toHaveBeenCalled()
    const updater = setPrefs.mock.calls[0][0]
    const result = updater(DEFAULT_PREFS)
    expect(result.units.weight).toBe('oz')
  })

  it('shows Data section label', () => {
    const { getByText } = renderSettings()
    expect(getByText('Data')).toBeTruthy()
  })

  it('pressing export-data calls onExport', () => {
    const onExport = jest.fn()
    const { getByTestId } = renderSettings({ onExport })
    fireEvent.press(getByTestId('export-data'))
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('pressing clear-data shows the confirm dialog', () => {
    const { getByTestId, getByText } = renderSettings()
    fireEvent.press(getByTestId('clear-data'))
    expect(getByText('Clear all data?')).toBeTruthy()
  })

  it('confirming clear-all calls onClearAll', async () => {
    // onClearAll (which closes the whole Settings modal) is deliberately deferred a beat past
    // the confirm dialog's own dismiss — see MODAL_DISMISS_DELAY_MS — so it isn't called
    // synchronously within this same press.
    const onClearAll = jest.fn()
    const { getByTestId } = renderSettings({ onClearAll })
    fireEvent.press(getByTestId('clear-data'))
    fireEvent.press(getByTestId('confirm-go'))
    expect(onClearAll).not.toHaveBeenCalled()
    await waitFor(() => expect(onClearAll).toHaveBeenCalledTimes(1))
  })

  // — Account section (signed-out) —
  describe('Account section (signed-out)', () => {
    it('renders account-signin button when account is null', () => {
      const { getByTestId } = renderSettings({ account: null })
      expect(getByTestId('account-signin')).toBeTruthy()
    })

    it('hides the account-signup button (email auth gated off for Apple-only build)', () => {
      const { queryByTestId } = renderSettings({ account: null })
      expect(queryByTestId('account-signup')).toBeNull()
    })

    it('does not render account-signout when signed out', () => {
      const { queryByTestId } = renderSettings({ account: null })
      expect(queryByTestId('account-signout')).toBeNull()
    })
  })

  // — Account section (signed-in) —
  describe('Account section (signed-in)', () => {
    const account: Account = { name: 'Anna', email: 'anna@example.com' }

    it('renders account name and email when signed in', () => {
      const { getByText } = renderSettings({ account })
      expect(getByText('Anna')).toBeTruthy()
      expect(getByText('anna@example.com')).toBeTruthy()
    })

    it('renders account-signout button when signed in', () => {
      const { getByTestId } = renderSettings({ account })
      expect(getByTestId('account-signout')).toBeTruthy()
    })

    it('pressing account-signout calls onSignOut', () => {
      const onSignOut = jest.fn()
      const { getByTestId } = renderSettings({ account, onSignOut })
      fireEvent.press(getByTestId('account-signout'))
      expect(onSignOut).toHaveBeenCalledTimes(1)
    })

    it('renders sync chip text for synced status', () => {
      const { getByTestId } = renderSettings({ account, sync: 'synced' })
      expect(getByTestId('sync-status').props.children).toBe('Synced just now')
    })

    it('renders sync chip text for syncing status', () => {
      const { getByTestId } = renderSettings({ account, sync: 'syncing' })
      expect(getByTestId('sync-status').props.children).toBe('Syncing…')
    })

    it('renders sync chip text for offline status', () => {
      const { getByTestId } = renderSettings({ account, sync: 'offline' })
      expect(getByTestId('sync-status').props.children).toBe('Offline, will sync later')
    })

    it('renders sync chip text for error status', () => {
      const { getByTestId } = renderSettings({ account, sync: 'error' })
      expect(getByTestId('sync-status').props.children).toBe('Sync error, tap to retry')
    })

    it('tapping account-delete then confirm-go calls onDeleteAccount', () => {
      const onDeleteAccount = jest.fn()
      const { getByTestId } = renderSettings({ account, onDeleteAccount })
      fireEvent.press(getByTestId('account-delete'))
      fireEvent.press(getByTestId('confirm-go'))
      expect(onDeleteAccount).toHaveBeenCalledTimes(1)
    })
  })

  // — About section —
  describe('About section', () => {
    it('renders the About section label', () => {
      const { getByText } = renderSettings()
      expect(getByText('About')).toBeTruthy()
    })

    it('renders the version value', () => {
      const { getByText } = renderSettings({ version: '2.5.0' })
      expect(getByText('2.5.0')).toBeTruthy()
    })

    it('renders static rows: Send feedback, Privacy Policy, Terms of Service', () => {
      const { getByText } = renderSettings()
      expect(getByText('Send feedback')).toBeTruthy()
      expect(getByText('Privacy Policy')).toBeTruthy()
      expect(getByText('Terms of Service')).toBeTruthy()
    })
  })
})
