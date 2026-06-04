import React from 'react'
import { render } from '@testing-library/react-native'
import BudgetBar from '../src/components/BudgetBar'

describe('BudgetBar', () => {
  it('shows stocked and budget kcal', () => {
    const { getByText } = render(<BudgetBar stockedKcal={3200} budgetKcal={8000} />)
    expect(getByText('3200 / 8000 kcal')).toBeTruthy()
  })

  it('clamps the fill width to 100% when over budget', () => {
    const { getByTestId } = render(<BudgetBar stockedKcal={9000} budgetKcal={8000} />)
    const fill = getByTestId('budget-bar-fill')
    // width style is a percentage string; over budget must clamp to '100%'
    const flat = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style)
      : fill.props.style
    expect(flat.width).toBe('100%')
  })

  it('computes a partial fill width', () => {
    const { getByTestId } = render(<BudgetBar stockedKcal={2000} budgetKcal={8000} />)
    const fill = getByTestId('budget-bar-fill')
    const flat = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style)
      : fill.props.style
    expect(flat.width).toBe('25%')
  })
})
