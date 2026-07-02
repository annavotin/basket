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
  it('shows the combined total (meal prep + pantry + extra) over budget', () => {
    const { getByText } = render(
      <BudgetBar mealPrepKcal={1000} pantryKcal={500} extraKcal={500} budgetKcal={8000} />
    )
    expect(getByText('2000')).toBeTruthy() // consumed
    expect(getByText(/8000 kcal/)).toBeTruthy() // budget
  })

  it('renders green meal-prep, pantry, and pink extra segments at the right widths', () => {
    const { getByTestId } = render(
      <BudgetBar mealPrepKcal={2000} pantryKcal={2000} extraKcal={2000} budgetKcal={8000} />
    )
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-pantry-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('25%')
  })

  it('never lets the three segments exceed 100% combined', () => {
    const { getByTestId } = render(
      <BudgetBar mealPrepKcal={6000} pantryKcal={4000} extraKcal={2000} budgetKcal={8000} />
    )
    expect(widthOf(getByTestId('budget-bar-fill'))).toBe('75%')
    expect(widthOf(getByTestId('budget-bar-pantry-fill'))).toBe('25%')
    expect(widthOf(getByTestId('budget-bar-extra-fill'))).toBe('0%')
  })

  it('renders a legend for all three components when each contributes kcal', () => {
    const { getByText } = render(
      <BudgetBar mealPrepKcal={500} pantryKcal={300} extraKcal={200} budgetKcal={2000} />
    )
    expect(getByText('Meal prep')).toBeTruthy()
    expect(getByText('Pantry')).toBeTruthy()
    expect(getByText('Extra')).toBeTruthy()
  })

  it('omits the Pantry and Extra legend items when they contribute nothing', () => {
    const { getByText, queryByText } = render(
      <BudgetBar mealPrepKcal={0} pantryKcal={0} extraKcal={0} budgetKcal={2000} />
    )
    expect(getByText('Meal prep')).toBeTruthy()
    expect(queryByText('Pantry')).toBeNull()
    expect(queryByText('Extra')).toBeNull()
  })
})
