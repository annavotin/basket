import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import ItemDetail from '../src/components/ItemDetail'
import { FoodItem, ExtraMeal, PantryItem } from '../src/types'

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme="light" accent={['#7CC96E', '#5FB152', '#3E8F38']}>{ui}</ThemeProvider>
)

const item: FoodItem = { name: 'Salmon', weightG: 600, kcal: 1254, emoji: '🐟', source: 'barcode', macrosPer100g: { protein: 20, carbs: 0, fat: 13 } }

describe('ItemDetail — basket item', () => {
  it('shows kcal and macro grams', () => {
    const { getByText } = wrap(<ItemDetail visible kind="item" item={item} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSaveItem={jest.fn()} />)
    expect(getByText('1,254')).toBeTruthy()
    expect(getByText('Scanned')).toBeTruthy()
    expect(getByText('120g')).toBeTruthy()
  })

  it('rescales kcal + macros when weight changes, and saves the patch', () => {
    const onSaveItem = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="item" item={item} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSaveItem={onSaveItem} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-weight'), '300')
    fireEvent.press(getByText('Save'))
    const patch = onSaveItem.mock.calls[0][0]
    expect(patch.weightG).toBe(300)
    expect(patch.kcal).toBe(627)
    expect(patch.macrosPer100g).toEqual({ protein: 20, carbs: 0, fat: 13 })
  })

  it('confirms before removing', () => {
    const onRemove = jest.fn()
    const { getByText } = wrap(<ItemDetail visible kind="item" item={item} days={5} onRemove={onRemove} onClose={jest.fn()} onSaveItem={jest.fn()} />)
    fireEvent.press(getByText('Remove from basket'))
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.press(getByText('Delete'))
    expect(onRemove).toHaveBeenCalled()
  })
})

describe('ItemDetail — extra', () => {
  const extra: ExtraMeal = { id: 'e1', date: '2026-06-04', name: 'Pizza slice', kcal: 285 }
  it('edits name + kcal and saves', () => {
    const onSaveExtra = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="extra" extra={extra} days={5} dateLabel="4 Jun" onRemove={jest.fn()} onClose={jest.fn()} onSaveExtra={onSaveExtra} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-extra-kcal'), '300')
    fireEvent.press(getByText('Save'))
    expect(onSaveExtra).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pizza slice', kcal: 300 }))
  })

  it('lets you edit macros and saves them', () => {
    const onSaveExtra = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="extra" extra={extra} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSaveExtra={onSaveExtra} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-macro-protein'), '22')
    fireEvent.press(getByText('Save'))
    expect(onSaveExtra.mock.calls[0][0].macros.protein).toBe(22)
  })
})

describe('ItemDetail — pantry', () => {
  const pantryItem: PantryItem = { id: 'p1', name: 'Oats', emoji: '🌾', kcalPer100g: 389, dailyG: 40 }
  it('edits kcal/100g + daily g and saves', () => {
    const onSavePantry = jest.fn()
    const { getByText, getByTestId } = wrap(<ItemDetail visible kind="pantry" pantryItem={pantryItem} days={5} onRemove={jest.fn()} onClose={jest.fn()} onSavePantry={onSavePantry} />)
    fireEvent.press(getByText('Edit'))
    fireEvent.changeText(getByTestId('id-pantry-daily'), '50')
    fireEvent.press(getByText('Save'))
    expect(onSavePantry).toHaveBeenCalledWith(expect.objectContaining({ kcalPer100g: 389, dailyG: 50 }))
  })
})

describe('ItemDetail — pantry this-week + default', () => {
  const pantryItem = { id: 'p1', emoji: '🥫', name: 'Oats', kcalPer100g: 379, dailyG: 40 }

  it('edits this-week grams and default per-day, saving both', () => {
    const onSavePantry = jest.fn()
    const { getByText, getByTestId } = wrap(
      <ItemDetail visible kind="pantry" pantryItem={pantryItem} pantryWeekG={280} days={7}
        onSavePantry={onSavePantry} onRemove={() => {}} onClose={() => {}} />
    )
    fireEvent.press(getByText('Edit'))
    expect(getByTestId('id-pantry-week').props.value).toBe('280')
    fireEvent.changeText(getByTestId('id-pantry-week'), '350')
    fireEvent.changeText(getByTestId('id-pantry-daily'), '50')
    fireEvent.press(getByText('Save'))
    expect(onSavePantry).toHaveBeenCalledWith(
      expect.objectContaining({ kcalPer100g: 379, dailyG: 50, thisWeekG: 350 })
    )
  })
})
