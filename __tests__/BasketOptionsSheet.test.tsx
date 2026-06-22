import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import BasketOptionsSheet from '../src/components/BasketOptionsSheet'

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>{ui}</ThemeProvider>)

describe('BasketOptionsSheet', () => {
  it('steps the prep length and fires delete', () => {
    const onDaysChange = jest.fn()
    const onDelete = jest.fn()
    const { getByTestId, getByText } = wrap(
      <BasketOptionsSheet visible dayCount={7} startDate="2026-06-22" dailyGoal={2000}
        onDaysChange={onDaysChange} onDelete={onDelete} onClose={() => {}} />
    )
    fireEvent.press(getByTestId('prep-days-inc'))
    expect(onDaysChange).toHaveBeenCalledWith(8)
    fireEvent.press(getByText('Delete basket'))
    expect(onDelete).toHaveBeenCalled()
  })
})
