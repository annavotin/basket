import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import ItemRow from '../src/components/ItemRow'

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>{ui}</ThemeProvider>)

describe('ItemRow', () => {
  it('renders name, subtitle, and kcal value, and fires onPress', () => {
    const onPress = jest.fn()
    const { getByText, getByTestId } = wrap(
      <ItemRow emoji="🥛" name="Oatly" subtitle="1000 g · 610 kcal" kcal={610} onPress={onPress} testID="row" />
    )
    expect(getByText('Oatly')).toBeTruthy()
    expect(getByText('1000 g · 610 kcal')).toBeTruthy()
    expect(getByText('610')).toBeTruthy()
    fireEvent.press(getByTestId('row'))
    expect(onPress).toHaveBeenCalled()
  })
})
