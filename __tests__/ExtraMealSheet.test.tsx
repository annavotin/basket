import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import ExtraMealSheet from '../src/components/ExtraMealSheet'

jest.mock('../src/config/features', () => ({ EMAIL_AUTH_ENABLED: true, EXTRAS_AI_ENABLED: true }))

describe('ExtraMealSheet', () => {
  it('does not save until description and calories are valid', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(<ExtraMealSheet visible onSave={onSave} onClose={() => {}} />)
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.press(getByTestId('save-extra-button')) // kcal still empty
    expect(onSave).not.toHaveBeenCalled()
  })

  it('emits the description and calorie estimate on save', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(<ExtraMealSheet visible onSave={onSave} onClose={() => {}} />)
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '850')
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).toHaveBeenCalledWith({ name: 'Sushi with friends', kcal: 850 })
  })

  // Regression: parseInt truncated decimal kcal input (e.g. "164.6" -> 164), same bug
  // class fixed elsewhere on 2026-07-01. Use parseFloat + round.
  it('does not truncate decimal kcal input', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(<ExtraMealSheet visible onSave={onSave} onClose={() => {}} />)
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '164.6')
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).toHaveBeenCalledWith({ name: 'Sushi with friends', kcal: 165 })
  })

  it('hides the Estimate button when onEstimate is not provided', () => {
    const { queryByTestId } = render(<ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} />)
    expect(queryByTestId('estimate-extra-button')).toBeNull()
  })

  it('disables the Estimate button until a description is typed', () => {
    const onEstimate = jest.fn()
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.press(getByTestId('estimate-extra-button'))
    expect(onEstimate).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    expect(onEstimate).toHaveBeenCalledWith('Burger and fries')
  })

  it('fills calories and reveals macro fields on a successful estimate', async () => {
    const onEstimate = jest.fn().mockResolvedValue({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    const { getByTestId, queryByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    expect(queryByTestId('extra-protein-input')).toBeNull() // hidden before any estimate
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(getByTestId('extra-kcal-input').props.value).toBe('550'))
    expect(getByTestId('extra-protein-input').props.value).toBe('20')
    expect(getByTestId('extra-carbs-input').props.value).toBe('60')
    expect(getByTestId('extra-fat-input').props.value).toBe('15')
  })

  it('includes macros in onSave once a successful estimate has revealed the fields', async () => {
    const onSave = jest.fn()
    const onEstimate = jest.fn().mockResolvedValue({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={onSave} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(getByTestId('extra-kcal-input').props.value).toBe('550'))
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Burger and fries', kcal: 550, macros: { protein: 20, carbs: 60, fat: 15 },
    })
  })

  it('shows an alert and leaves fields editable when the estimate fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const onEstimate = jest.fn().mockResolvedValue(null)
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'a vague thing')
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      "Couldn't estimate that", 'Try a more specific description, or enter calories manually.'
    ))
    fireEvent.changeText(getByTestId('extra-kcal-input'), '300') // still manually editable
    expect(getByTestId('extra-kcal-input').props.value).toBe('300')
    alertSpy.mockRestore()
  })

  it('shows a sign-in alert and does not call onEstimate when signedIn is false', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const onEstimate = jest.fn()
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    expect(onEstimate).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign in to use AI estimates', 'Create an account or sign in from Settings to use AI-estimated calories.'
    )
    alertSpy.mockRestore()
  })
})
