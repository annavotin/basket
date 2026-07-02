import React, { useState } from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import NutritionFields from '../src/components/NutritionFields'
import { Macros } from '../src/types'

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

it('falls back to per-100g when weight is unknown (G=0) in total mode, without zeroing values', () => {
  const onChange = jest.fn()
  const { getByTestId } = wrap(<NutritionFields {...base} G={0} basis="total" onChange={onChange} />)
  // displays the real per-100g value, not 0
  expect(getByTestId('nf-kcal').props.value).toBe('66')
  // typing stores the entered value directly as canonical per-100g, not 0
  fireEvent.changeText(getByTestId('nf-kcal'), '100')
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kcalPer100g: 100 }))
})

// A real parent (AddItemSheet/ItemDetail) is stateful: each onChange feeds new canonical
// props right back down. Static-prop tests above can't exercise that round-trip.
function StatefulHost() {
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(66)
  const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>({ protein: 4, carbs: 7, fat: 2 })
  return (
    <NutritionFields
      basis="per100g" onBasisChange={() => {}} G={1500} editable
      kcalPer100g={kcalPer100g} macrosPer100g={macrosPer100g}
      onChange={(next) => { setKcalPer100g(next.kcalPer100g); setMacrosPer100g(next.macrosPer100g) }}
    />
  )
}

it('does not clobber an untouched sibling field when clearing one field at a time (stateful round-trip)', () => {
  const { getByTestId } = wrap(<StatefulHost />)
  fireEvent.changeText(getByTestId('nf-protein'), '')
  fireEvent.changeText(getByTestId('nf-carbs'), '')
  fireEvent.changeText(getByTestId('nf-fat'), '')
  // Each clear's own round-trip must not resurrect a sibling field that was already blanked.
  expect(getByTestId('nf-protein').props.value).toBe('')
  expect(getByTestId('nf-carbs').props.value).toBe('')
  expect(getByTestId('nf-fat').props.value).toBe('')
})
