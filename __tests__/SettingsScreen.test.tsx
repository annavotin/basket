import React, { useState } from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import SettingsScreen from '../src/components/SettingsScreen'
import { Preferences } from '../src/types'

const DEFAULT_PREFS: Preferences = {
  name: 'Anna',
  defaultDays: 4,
  units: { weight: 'g', energy: 'kcal' },
  theme: 'system',
  accent: ['#7CC96E', '#5FB152', '#3E8F38'],
  macroTargets: { protein: 50, carbs: 200, fat: 70 },
}

function renderSettings(overrides?: Partial<Parameters<typeof SettingsScreen>[0]>) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    prefs: DEFAULT_PREFS,
    setPrefs: jest.fn(),
    dailyGoal: 2000,
    onDailyGoal: jest.fn(),
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
    expect(getByText('Profile')).toBeTruthy()
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
        />
      )
    }
    const { getByTestId } = render(<Wrapper />)
    fireEvent.press(getByTestId('theme-dark'))
    // After re-render, theme-dark should be selected (accessibilityState.selected = true)
    expect(getByTestId('theme-dark').props.accessibilityState?.selected).toBe(true)
  })

  it('selecting accent-1 calls setPrefs with the second accent option', () => {
    const setPrefs = jest.fn()
    const { getByTestId } = renderSettings({ setPrefs })
    fireEvent.press(getByTestId('accent-1'))
    expect(setPrefs).toHaveBeenCalled()
    const updater = setPrefs.mock.calls[0][0]
    const result = updater(DEFAULT_PREFS)
    expect(result.accent[0]).toBe('#E6A23C')
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
})
