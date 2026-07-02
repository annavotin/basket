import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import NutritionFields from '../src/components/NutritionFields'

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme="light" accent={['#7CC96E', '#5FB152', '#3E8F38']}>{ui}</ThemeProvider>
)

const base = {
  G: 1500, kcalPer100g: 66, macrosPer100g: { protein: 4, carbs: 7, fat: 2 },
  editable: true, onChange: jest.fn(), onBasisChange: jest.fn(),
}

it('shows per-100g values in per100g mode', () => {
  const { getByTestId } = wrap(<NutritionFields {...base} basis="per100g" />)
  expect(getByTestId('nf-kcal').props.value).toBe('66')
})

it('shows totals over G in total mode', () => {
  const { getByTestId } = wrap(<NutritionFields {...base} basis="total" />)
  expect(getByTestId('nf-kcal').props.value).toBe('990')
})

it('edits convert back to canonical per-100g', () => {
  const onChange = jest.fn()
  const { getByTestId } = wrap(<NutritionFields {...base} basis="total" onChange={onChange} />)
  fireEvent.changeText(getByTestId('nf-kcal'), '1500')
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kcalPer100g: 100 }))
})
