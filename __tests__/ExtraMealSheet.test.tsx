import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ExtraMealSheet from '../src/components/ExtraMealSheet'

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
})
