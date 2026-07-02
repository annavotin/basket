import React from 'react'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'

jest.mock('../src/services/foodApi', () => ({
  searchProductsByName: jest.fn().mockResolvedValue([]),
}))

import AddItemSheet from '../src/components/AddItemSheet'
import { Product } from '../src/mockProducts'

const product: Product = { name: 'Nutella', emoji: '🍫', packageWeightG: 400, kcalPer100g: 539 }

describe('AddItemSheet — scanned mode', () => {
  it('adds a found item straight from the summary without editing', () => {
    const onAdd = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={product} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    // Default scanned view: summary only — no editable fields until you tap Edit.
    expect(queryByTestId('weight-input')).toBeNull()
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nutella', weightG: 400, kcal: 2156, quantity: 1, source: 'barcode',
      })
    )
  })

  it('edits the prefilled weight after tapping Edit and emits quantity + per-unit kcal', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={product} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('edit-product-button'))
    const weight = getByTestId('weight-input')
    expect(weight.props.value).toBe('400')
    fireEvent.changeText(weight, '200')
    fireEvent.press(getByTestId('qty-inc'))
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nutella', weightG: 200, kcal: 1078, quantity: 2, source: 'barcode',
      })
    )
  })
})

describe('AddItemSheet — manual mode', () => {
  it('autofills name + kcal from a tapped local suggestion', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    // Banana ships a "per banana" serving, so it opens on that unit pill;
    // switch to Custom (g) to enter an arbitrary weight.
    fireEvent.press(getByText('Custom (g)'))
    fireEvent.changeText(getByTestId('weight-input'), '120')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Banana', weightG: 120, kcal: 107, quantity: 1, source: 'manual',
      })
    )
  })

  it('prefills macros from a tapped suggestion and shows them editable', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    // Banana ships a "per banana" serving, so it opens on that unit pill;
    // switch to Custom (g) to enter an arbitrary weight.
    fireEvent.press(getByText('Custom (g)'))
    expect(getByTestId('nf-protein').props.value).not.toBe('')
  })

  it('shows a calories-per-100g field for a free item with no match and uses it', () => {
    const onAdd = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Grandmas Stew')
    const per100 = getByTestId('nf-kcal')
    expect(per100).toBeTruthy()
    fireEvent.changeText(per100, '150')
    fireEvent.changeText(getByTestId('weight-input'), '300')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Grandmas Stew', weightG: 300, kcal: 450, quantity: 1 })
    )
    expect(queryByTestId('manual-kcal-input')).toBeNull()
  })

  it('hides the kcal preview until weight & calories are entered', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Plain Item')
    expect(queryByTestId('kcal-preview')).toBeNull()
  })
})

describe('AddItemSheet — validation guard', () => {
  it('does not add when weight is empty, and adds once weight is set', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    fireEvent.press(getByTestId('add-item-button')) // weight still empty -> guarded
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('nf-kcal'), '80')
    fireEvent.changeText(getByTestId('weight-input'), '250')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mystery Soup', weightG: 250, kcal: 200, quantity: 1 })
    )
  })
})

it('passes the product macrosPer100g onto the added item', () => {
  const onAdd = jest.fn()
  const product = { name: 'Yogurt', emoji: '🥛', packageWeightG: 500, kcalPer100g: 59, macrosPer100g: { protein: 10, carbs: 4, fat: 0.4 } }
  const { getByText } = render(
    <ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>
      <AddItemSheet visible product={product} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    </ThemeProvider>
  )
  fireEvent.press(getByText('Add to period'))
  expect(onAdd.mock.calls[0][0].macrosPer100g).toEqual({ protein: 10, carbs: 4, fat: 0.4 })
})

describe('AddItemSheet — scan toggles', () => {
  const scanned: Product = { name: 'Oatly', emoji: '🥛', packageWeightG: 1000, kcalPer100g: 61 }

  it('found scan: Edit button + Keep-scanning, but no Remember until you edit', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('edit-product-button')).toBeTruthy()
    expect(getByTestId('toggle-keep-scanning')).toBeTruthy()
    expect(queryByTestId('toggle-remember')).toBeNull()
  })

  it('reveals Remember + editable fields after tapping Edit (Remember defaults on)', () => {
    const onSaveForLater = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onSaveForLater={onSaveForLater} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('edit-product-button'))
    expect(onSaveForLater).toHaveBeenCalledWith(true)
    expect(getByTestId('toggle-remember')).toBeTruthy()
    expect(getByTestId('edit-name-input')).toBeTruthy()
    expect(getByTestId('weight-input')).toBeTruthy()
    expect(getByTestId('nf-kcal')).toBeTruthy()
    expect(queryByTestId('edit-product-button')).toBeNull() // Edit hides once editing
  })

  it('not-found scan (manual entry): shows Remember + Keep-scanning, no Edit button', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('toggle-remember')).toBeTruthy()
    expect(getByTestId('toggle-keep-scanning')).toBeTruthy()
    expect(queryByTestId('edit-product-button')).toBeNull()
  })

  it('hides all toggles + Edit on a manual + add (not scanned)', () => {
    const { queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('toggle-remember')).toBeNull()
    expect(queryByTestId('toggle-keep-scanning')).toBeNull()
    expect(queryByTestId('edit-product-button')).toBeNull()
  })

  it('reports Remember + Keep-scanning changes to the parent', () => {
    const onSaveForLater = jest.fn()
    const onKeepScanning = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet
        visible product={null} scanned
        saveForLater onSaveForLater={onSaveForLater}
        keepScanning={false} onKeepScanning={onKeepScanning}
        onAdd={() => {}} onClose={() => {}}
        basis="per100g" onBasisChange={() => {}}
      />
    )
    fireEvent.press(getByTestId('toggle-remember'))      // true -> false
    expect(onSaveForLater).toHaveBeenCalledWith(false)
    fireEvent.press(getByTestId('toggle-keep-scanning'))  // false -> true
    expect(onKeepScanning).toHaveBeenCalledWith(true)
  })

  it('still emits the item on Add (found, from summary)', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly', source: 'barcode' }))
  })
})
