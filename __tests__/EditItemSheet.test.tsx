import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import EditItemSheet from '../src/components/EditItemSheet'
import { FoodItem } from '../src/types'

const baseItem: FoodItem = {
  name: 'Chicken',
  weightG: 200,
  kcal: 300,
  emoji: '🍗',
  quantity: 2,
  source: 'manual',
}

describe('EditItemSheet', () => {
  it('prefills fields from the given item', () => {
    const { getByTestId } = render(
      <EditItemSheet visible item={baseItem} onSave={jest.fn()} onClose={jest.fn()} />
    )
    expect(getByTestId('edit-name-input').props.value).toBe('Chicken')
    expect(getByTestId('edit-weight-input').props.value).toBe('200')
    expect(getByTestId('edit-kcal-input').props.value).toBe('300')
    expect(getByTestId('edit-qty-value').props.children).toBe(2)
  })

  it('defaults quantity to 1 when item has no quantity', () => {
    const item: FoodItem = { name: 'Rice', weightG: 100, kcal: 130, emoji: '🍚' }
    const { getByTestId } = render(
      <EditItemSheet visible item={item} onSave={jest.fn()} onClose={jest.fn()} />
    )
    expect(getByTestId('edit-qty-value').props.children).toBe(1)
  })

  it('emits updated FoodItem on Save, preserving emoji and source', () => {
    const onSave = jest.fn()
    const { getByTestId } = render(
      <EditItemSheet visible item={baseItem} onSave={onSave} onClose={jest.fn()} />
    )

    fireEvent.changeText(getByTestId('edit-name-input'), 'Grilled Chicken')
    fireEvent.changeText(getByTestId('edit-weight-input'), '250')
    fireEvent.changeText(getByTestId('edit-kcal-input'), '350')
    fireEvent.press(getByTestId('edit-qty-increment'))

    fireEvent.press(getByTestId('save-edit-button'))

    expect(onSave).toHaveBeenCalledWith({
      name: 'Grilled Chicken',
      weightG: 250,
      kcal: 350,
      emoji: '🍗',
      quantity: 3,
      source: 'manual',
    })
  })

  it('quantity stepper respects min of 1', () => {
    const item: FoodItem = { name: 'Rice', weightG: 100, kcal: 130, emoji: '🍚', quantity: 1 }
    const { getByTestId } = render(
      <EditItemSheet visible item={item} onSave={jest.fn()} onClose={jest.fn()} />
    )
    fireEvent.press(getByTestId('edit-qty-decrement'))
    expect(getByTestId('edit-qty-value').props.children).toBe(1)
  })

  it('Save is disabled when weight is cleared', () => {
    const { getByTestId } = render(
      <EditItemSheet visible item={baseItem} onSave={jest.fn()} onClose={jest.fn()} />
    )
    fireEvent.changeText(getByTestId('edit-weight-input'), '')
    expect(getByTestId('save-edit-button').props.accessibilityState?.disabled).toBeTruthy()
  })

  it('Save is disabled when name is empty', () => {
    const { getByTestId } = render(
      <EditItemSheet visible item={baseItem} onSave={jest.fn()} onClose={jest.fn()} />
    )
    fireEvent.changeText(getByTestId('edit-name-input'), '   ')
    expect(getByTestId('save-edit-button').props.accessibilityState?.disabled).toBeTruthy()
  })

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <EditItemSheet visible item={baseItem} onSave={jest.fn()} onClose={onClose} />
    )
    fireEvent.press(getByTestId('cancel-button'))
    expect(onClose).toHaveBeenCalled()
  })
})
