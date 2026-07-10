import React from 'react'
import { render } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import PeriodHeader from '../src/components/PeriodHeader'

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme="light" accent={['#7CC96E', '#5FB152', '#3E8F38']}>{ui}</ThemeProvider>
)

describe('PeriodHeader', () => {
  it('shows the title and "{count} items · {kcal}" with grouping', () => {
    const { getByText } = wrap(<PeriodHeader title="This batch" count={14} kcal={5237} />)
    expect(getByText('This batch')).toBeTruthy()
    expect(getByText('14 items · 5,237 kcal')).toBeTruthy()
  })

  it('uses the singular "item" for a count of 1', () => {
    const { getByText } = wrap(<PeriodHeader title="Extra meals" count={1} kcal={300} />)
    expect(getByText('1 item · 300 kcal')).toBeTruthy()
  })

  it('omits the energy segment when kcal is 0', () => {
    const { getByText } = wrap(<PeriodHeader title="Pantry staples" count={0} kcal={0} />)
    expect(getByText('0 items')).toBeTruthy()
  })
})
