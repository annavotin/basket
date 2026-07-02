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
      }),
      { save: false }
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
      }),
      { save: true }
    )
  })
})

describe('AddItemSheet — manual mode', () => {
  it('shows a summary with an Edit button after picking a suggestion, then reveals editable fields', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    // Summary first: no editable weight field yet, but an Edit button is present.
    expect(queryByTestId('weight-input')).toBeNull()
    expect(getByTestId('edit-product-button')).toBeTruthy()
    fireEvent.press(getByTestId('edit-product-button'))
    expect(queryByTestId('edit-product-button')).toBeNull() // hides once editing
    // Banana ships a "per banana" serving, so it opens on that unit pill;
    // switch to Custom (g) to enter an arbitrary weight.
    fireEvent.press(getByText('Custom (g)'))
    fireEvent.changeText(getByTestId('weight-input'), '120')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Banana', weightG: 120, kcal: 107, quantity: 1, source: 'manual',
      }),
      { save: true } // weight change makes it dirty -> saved
    )
  })

  it('skips the summary straight into Edit when a picked suggestion has no known weight', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'cauliflower')
    await waitFor(() => getByText('Cauliflower'))
    fireEvent.press(getByText('Cauliflower'))
    // No servings and no packageWeightG for this local staple — nothing to summarize,
    // so it should open directly into Edit (mirrors an unknown-weight scanned product).
    expect(queryByTestId('edit-product-button')).toBeNull()
    expect(getByTestId('weight-input')).toBeTruthy()
    expect(getByTestId('nf-kcal')).toBeTruthy()
    fireEvent.changeText(getByTestId('weight-input'), '200')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cauliflower', weightG: 200, kcal: 50 }),
      { save: true },
    )
  })

  it('prefills macros from a tapped suggestion, editable after tapping Edit', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    fireEvent.press(getByTestId('edit-product-button'))
    fireEvent.press(getByText('Custom (g)'))
    expect(getByTestId('nf-protein').props.value).not.toBe('')
  })

  it('shows the weight per pack in the summary before editing', async () => {
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    fireEvent.press(getByText('Banana'))
    expect(getByText(/per pack/)).toBeTruthy()
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
      expect.objectContaining({ name: 'Grandmas Stew', weightG: 300, kcal: 450, quantity: 1 }),
      { save: true }
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

  it('shows only the search bar on a fresh open, before typing or picking anything', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('manual-name-input')).toBeTruthy()
    expect(queryByTestId('qty')).toBeNull()
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
    expect(queryByTestId('add-item-button')).toBeNull()
    expect(getByTestId('cancel-button')).toBeTruthy() // always reachable
  })

  it('reveals quantity, toggles, and the add button once a name is typed', () => {
    const { getByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    expect(getByTestId('qty')).toBeTruthy()
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
    expect(getByTestId('add-item-button')).toBeTruthy()
  })

  it('labels the weight field "per pack"', () => {
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    expect(getByText('Weight per pack (g)')).toBeTruthy()
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
      expect.objectContaining({ name: 'Mystery Soup', weightG: 250, kcal: 200, quantity: 1 }),
      { save: true }
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

  it('found scan: Edit button + Keep-scanning shown before editing; Save to My Foods stays hidden until changed', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('edit-product-button')).toBeTruthy()
    expect(getByTestId('toggle-keep-scanning')).toBeTruthy()
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
  })

  it('reveals editable fields after tapping Edit; Save to My Foods appears once something changes', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
    fireEvent.press(getByTestId('edit-product-button'))
    expect(queryByTestId('toggle-save-to-foods')).toBeNull() // still unedited
    expect(getByTestId('edit-name-input')).toBeTruthy()
    expect(getByTestId('weight-input')).toBeTruthy()
    expect(getByTestId('nf-kcal')).toBeTruthy()
    expect(queryByTestId('edit-product-button')).toBeNull() // Edit hides once editing
    fireEvent.changeText(getByTestId('weight-input'), '750')
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy() // now dirty
  })

  it('not-found scan (manual entry): shows Save to My Foods + Keep-scanning, no Edit button', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
    expect(getByTestId('toggle-keep-scanning')).toBeTruthy()
    expect(queryByTestId('edit-product-button')).toBeNull()
  })

  it('shows Save to My Foods (default on) but hides Keep-scanning + Edit on a manual add (not scanned)', () => {
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Something') // reveal the toggle group
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
    expect(queryByTestId('toggle-keep-scanning')).toBeNull()
    expect(queryByTestId('edit-product-button')).toBeNull()
  })

  it('toggling Save to My Foods off (after an edit reveals it) carries save:false into onAdd', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('edit-product-button'))
    fireEvent.changeText(getByTestId('weight-input'), '500') // dirty -> toggle appears, defaults on
    fireEvent.press(getByTestId('toggle-save-to-foods'))     // true -> false
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly' }), { save: false })
  })

  it('reports Keep-scanning changes to the parent', () => {
    const onKeepScanning = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet
        visible product={null} scanned
        keepScanning={false} onKeepScanning={onKeepScanning}
        onAdd={() => {}} onClose={() => {}}
        basis="per100g" onBasisChange={() => {}}
      />
    )
    fireEvent.press(getByTestId('toggle-keep-scanning'))  // false -> true
    expect(onKeepScanning).toHaveBeenCalledWith(true)
  })

  it('still emits the item on Add (found, from summary) — unedited, so it is not (re)saved', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly', source: 'barcode' }), { save: false })
  })
})

describe('AddItemSheet — Save to My Foods', () => {
  it('reads "Update <name>" when the food already exists in My Foods', () => {
    const custom = [{ id: 'cf1', name: 'Kale', emoji: '🥬', kcalPer100g: 33, createdAt: 1, updatedAt: 1 }]
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} customFoods={custom} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Kale')
    expect(getByText(/Update .Kale./)).toBeTruthy()
  })

  it('links a scanned barcode to the food being saved', async () => {
    const onAdd = jest.fn()
    const onScanForBarcode = jest.fn(() => Promise.resolve('50000001'))
    const { getByTestId, getByText, findByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} onScanForBarcode={onScanForBarcode} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Home Hummus')
    fireEvent.press(getByText('Link a barcode'))
    expect(await findByText('Barcode linked ✓')).toBeTruthy()
  })

  it('resets to default ON when the sheet reopens for a new item, even after being turned off', () => {
    const onAdd = jest.fn()
    const { getByTestId, rerender } = render(
      <AddItemSheet visible={false} product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    rerender(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'placeholder') // reveal the toggle group
    fireEvent.press(getByTestId('toggle-save-to-foods')) // true -> false
    // Close, then reopen fresh (as App.tsx does between adds) — should default back to on.
    rerender(
      <AddItemSheet visible={false} product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    rerender(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Fresh Item')
    fireEvent.changeText(getByTestId('nf-kcal'), '50')
    fireEvent.changeText(getByTestId('weight-input'), '100')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Fresh Item' }), { save: true })
  })
})

describe('AddItemSheet — Save to My Foods only when new or edited', () => {
  const scanned: Product = { name: 'Oatly', emoji: '🥛', packageWeightG: 1000, kcalPer100g: 61 }

  it('hides the save toggle for a picked/scanned food that has not been changed', () => {
    const { queryByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
  })

  it('reveals the save toggle once weight is edited away from the original', () => {
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('edit-product-button'))
    fireEvent.changeText(getByTestId('weight-input'), '500')
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
  })

  it('does not save an unchanged picked/scanned item, even though the internal toggle default is on', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={scanned} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oatly' }), { save: false })
  })

  it('always shows the save toggle for a fully-custom typed item', () => {
    const { getByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Home Hummus')
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
  })
})
