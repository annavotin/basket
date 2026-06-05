import React from 'react'
import { render } from '@testing-library/react-native'
import BudgetBar from '../src/components/BudgetBar'

function widthOf(node: any): string {
  const flat = Array.isArray(node.props.style)
    ? Object.assign({}, ...node.props.style)
    : node.props.style
  return flat.width
}

describe('BudgetBar', () => {
  it('shows the combined total over budget', () => {
    const { getByText } = render(<BudgetBar mealPrepKcal={1000} extraKcal={500} budgetKcal={8000} />)
    expect(getByText('1500 / 8000 kcal')).toBeTruthy()
  })

  it('renders green meal-prep and pink extra segments at the right widths', () => {
    const { getByTestId } = render(<BudgetBar mealPrepKcal={2000} extraKcal={2000} budgetKcal={8000} />)
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('25%')
  })

  it('never lets the two segments exceed 100% combined', () => {
    const { getByTestId } = render(<BudgetBar mealPrepKcal={6000} extraKcal={5000} budgetKcal={8000} />)
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('75%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('25%')
  })

  it('renders a legend for both components', () => {
    const { getByText } = render(<BudgetBar mealPrepKcal={0} extraKcal={0} budgetKcal={2000} />)
    expect(getByText('Meal prep')).toBeTruthy()
    expect(getByText('Extra')).toBeTruthy()
  })
})
