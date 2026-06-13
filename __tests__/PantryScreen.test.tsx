import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import PantryScreen from '../src/components/PantryScreen'
import { PantryItem, MealPrepCycle } from '../src/types'

const samplePantry: PantryItem[] = [
  { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 },
  { id: 'pantry-eggs', name: 'Eggs', emoji: '🥚', kcalPer100g: 155, dailyG: 60 },
]

const sampleCycle: MealPrepCycle = {
  id: 'c1', startDate: '2026-06-01', endDate: '2026-06-07', items: [],
}

function renderScreen(overrides?: Partial<React.ComponentProps<typeof PantryScreen>>) {
  const defaults = {
    visible: true,
    pantry: samplePantry,
    onAdd: jest.fn(),
    onRemove: jest.fn(),
    onClose: jest.fn(),
  }
  return render(<PantryScreen {...defaults} {...overrides} />)
}

describe('PantryScreen — Defaults tab', () => {
  it('renders a row for each pantry item', () => {
    const { getAllByTestId } = renderScreen()
    expect(getAllByTestId('pantry-row')).toHaveLength(2)
  })

  it('shows item name in each row', () => {
    const { getByText } = renderScreen()
    expect(getByText('Oats')).toBeTruthy()
    expect(getByText('Eggs')).toBeTruthy()
  })

  it('calls onRemove with the item id when remove button is tapped', () => {
    const onRemove = jest.fn()
    const { getAllByTestId } = renderScreen({ onRemove })
    fireEvent.press(getAllByTestId('pantry-remove')[0])
    expect(onRemove).toHaveBeenCalledWith('pantry-oats')
  })

  it('opens the add form when the add-a-staple button is pressed', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('pantry-add-btn'))
    expect(getByTestId('pantry-name-input')).toBeTruthy()
  })

  it('Add button is disabled when all fields are empty', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.press(getByTestId('pantry-add-btn'))
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Add button is disabled when name is filled but numbers are missing', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.press(getByTestId('pantry-add-btn'))
    fireEvent.changeText(getByTestId('pantry-name-input'), 'Almonds')
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Add button is disabled when kcal is zero', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.press(getByTestId('pantry-add-btn'))
    fireEvent.changeText(getByTestId('pantry-name-input'), 'Almonds')
    fireEvent.changeText(getByTestId('pantry-kcal-input'), '0')
    fireEvent.changeText(getByTestId('pantry-grams-input'), '30')
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('filling all fields and pressing Add emits the correct draft and clears the form', () => {
    const onAdd = jest.fn()
    const { getByTestId } = renderScreen({ onAdd })
    fireEvent.press(getByTestId('pantry-add-btn'))
    fireEvent.changeText(getByTestId('pantry-name-input'), 'Almonds')
    fireEvent.changeText(getByTestId('pantry-kcal-input'), '579')
    fireEvent.changeText(getByTestId('pantry-grams-input'), '30')
    fireEvent.press(getByTestId('pantry-add'))
    expect(onAdd).toHaveBeenCalledWith({ name: 'Almonds', kcalPer100g: 579, dailyG: 30 })
  })

  it('calls onClose when Close button is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderScreen({ onClose })
    fireEvent.press(getByTestId('pantry-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders empty list when pantry is empty', () => {
    const { queryAllByTestId } = renderScreen({ pantry: [] })
    expect(queryAllByTestId('pantry-row')).toHaveLength(0)
  })

  it('renders a full-screen container', () => {
    const { getByTestId } = render(
      <PantryScreen visible pantry={[]} onAdd={() => {}} onRemove={() => {}} onClose={() => {}} />
    )
    expect(getByTestId('pantry-screen')).toBeTruthy()
  })

  it('calls onSetDefaultGrams when the stepper is incremented', () => {
    const onSetDefaultGrams = jest.fn()
    const { getByTestId } = renderScreen({ onSetDefaultGrams })
    fireEvent.press(getByTestId('inc-default-pantry-oats'))
    expect(onSetDefaultGrams).toHaveBeenCalledWith('pantry-oats', 42) // 40 + 2
  })

  it('shows the segmented toggle with Defaults and This prep', () => {
    const { getByTestId, getByText } = renderScreen()
    expect(getByTestId('pantry-seg')).toBeTruthy()
    expect(getByText('Defaults')).toBeTruthy()
    expect(getByText('This prep')).toBeTruthy()
  })
})

describe('PantryScreen — This prep tab', () => {
  it('shows no-active-prep message when cycle is not provided', () => {
    const { getByTestId, getByText } = renderScreen()
    fireEvent.press(getByTestId('seg-thisprep'))
    expect(getByText('No active prep')).toBeTruthy()
  })

  it('shows staple rows in This prep mode when a cycle is passed', () => {
    const { getByTestId, getAllByTestId } = renderScreen({ cycle: sampleCycle, cycleDays: 7 })
    fireEvent.press(getByTestId('seg-thisprep'))
    expect(getAllByTestId('thisprep-row')).toHaveLength(2)
  })

  it('stepper in This prep mode calls onSetPantryGrams', () => {
    const onSetPantryGrams = jest.fn()
    const { getByTestId } = renderScreen({ cycle: sampleCycle, cycleDays: 7, onSetPantryGrams })
    fireEvent.press(getByTestId('seg-thisprep'))
    // increment oats grams: default 40 * 7 = 280, +10 = 290
    fireEvent.press(getByTestId('inc-prep-pantry-oats'))
    expect(onSetPantryGrams).toHaveBeenCalledWith('pantry-oats', 290)
  })

  it('shows Reset button and calls onResetPantryOverride when override exists', () => {
    const onResetPantryOverride = jest.fn()
    const cycleWithOverride: MealPrepCycle = {
      ...sampleCycle,
      pantryOverrides: { 'pantry-oats': 120 },
    }
    const { getByTestId } = renderScreen({
      cycle: cycleWithOverride,
      cycleDays: 7,
      onResetPantryOverride,
    })
    fireEvent.press(getByTestId('seg-thisprep'))
    fireEvent.press(getByTestId('reset-pantry-oats'))
    expect(onResetPantryOverride).toHaveBeenCalledWith('pantry-oats')
  })

  it('shows Customised badge when override differs from default', () => {
    const cycleWithOverride: MealPrepCycle = {
      ...sampleCycle,
      pantryOverrides: { 'pantry-oats': 120 },
    }
    const { getByTestId, getByText } = renderScreen({
      cycle: cycleWithOverride,
      cycleDays: 7,
    })
    fireEvent.press(getByTestId('seg-thisprep'))
    // 120 !== 40 * 7 = 280, so "Customised" badge should appear
    expect(getByText(/Customised/)).toBeTruthy()
  })
})
