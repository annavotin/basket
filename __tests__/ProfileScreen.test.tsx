import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ProfileScreen from '../src/components/ProfileScreen'

describe('ProfileScreen', () => {
  it('shows the prefilled daily goal value', () => {
    const { getByTestId } = render(
      <ProfileScreen visible={true} dailyGoal={2000} onSave={jest.fn()} onClose={jest.fn()} />
    )
    expect(getByTestId('daily-goal-input').props.value).toBe('2000')
  })

  it('calls onSave with the parsed number when Save is pressed with a valid value', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(
      <ProfileScreen visible={true} dailyGoal={2000} onSave={onSave} onClose={jest.fn()} />
    )
    fireEvent.changeText(getByTestId('daily-goal-input'), '1800')
    fireEvent.press(getByTestId('save-profile'))
    expect(onSave).toHaveBeenCalledWith(1800)
  })

  it('does not call onSave when the input is blank', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(
      <ProfileScreen visible={true} dailyGoal={2000} onSave={onSave} onClose={jest.fn()} />
    )
    fireEvent.changeText(getByTestId('daily-goal-input'), '')
    fireEvent.press(getByTestId('save-profile'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not call onSave when the value is 0', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(
      <ProfileScreen visible={true} dailyGoal={2000} onSave={onSave} onClose={jest.fn()} />
    )
    fireEvent.changeText(getByTestId('daily-goal-input'), '0')
    fireEvent.press(getByTestId('save-profile'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when Close is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <ProfileScreen visible={true} dailyGoal={2000} onSave={jest.fn()} onClose={onClose} />
    )
    fireEvent.press(getByTestId('profile-close'))
    expect(onClose).toHaveBeenCalled()
  })
})
