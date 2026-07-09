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
    // Default scanned view: pack size is visible/editable straight away, but macros stay
    // behind Edit until tapped.
    expect(getByTestId('weight-input')).toBeTruthy()
    expect(queryByTestId('nf-kcal')).toBeNull()
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

  it('defaults to the "Whole pack" pill at the package weight when packageWeightG is known', () => {
    const { getByText } = render(
      <AddItemSheet visible product={product} scanned onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByText('Whole pack · 400 g')).toBeTruthy()
  })

  it('selects "Whole pack" with an empty weight and disables Add when packageWeightG is unknown', () => {
    const unknownPack: Product = { name: 'Mystery Snack', emoji: '🍫', packageWeightG: 0, kcalPer100g: 400 }
    const onAdd = jest.fn()
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={unknownPack} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    expect(getByText('Whole pack')).toBeTruthy()
    expect(getByTestId('weight-input').props.value).toBe('')
    expect(getByText('Enter the pack size')).toBeTruthy()
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('weight-input'), '150')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mystery Snack', weightG: 150 }),
      { save: true }
    )
  })

  it('edits the scanned name and uses the edited name on Add', () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={product} scanned onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('scanned-name-input'), 'Nutella (family size)')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nutella (family size)' }),
      { save: false }
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
    // Tile + pack size (as a serving pill, since Banana ships one) are visible right away;
    // macros stay behind Edit until tapped.
    expect(getByText('per banana')).toBeTruthy()
    expect(queryByTestId('nf-kcal')).toBeNull()
    expect(getByTestId('edit-product-button')).toBeTruthy()
    fireEvent.press(getByTestId('edit-product-button'))
    expect(queryByTestId('edit-product-button')).toBeNull() // hides once editing
    expect(getByTestId('nf-kcal')).toBeTruthy() // macros now revealed
    // Banana ships a "per banana" serving, so it opens on that unit pill;
    // switch to Custom (g) to enter an arbitrary weight (pack size was already editable
    // before tapping Edit — this just changes which serving option is selected).
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

  it('shows the tile and an always-editable weight field even when the pack size is unknown', async () => {
    const onAdd = jest.fn()
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'cauliflower')
    await waitFor(() => getByText('Cauliflower'))
    fireEvent.press(getByText('Cauliflower'))
    // No servings and no packageWeightG for this local staple — the pack-size field is
    // still there (blank) and directly editable, with no need to tap Edit first. Macros
    // stay behind Edit, same as any other picked food.
    expect(getByTestId('edit-product-button')).toBeTruthy()
    expect(getByTestId('weight-input')).toBeTruthy()
    expect(queryByTestId('nf-kcal')).toBeNull()
    fireEvent.changeText(getByTestId('weight-input'), '200')
    fireEvent.press(getByTestId('add-item-button'))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cauliflower', weightG: 200, kcal: 50 }),
      { save: true },
    )
  })

  it('hides Quantity/Save/Link/Add while search results are still showing, before a suggestion is picked', async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana'))
    // The suggestion is visible, but nothing has been picked yet — the bottom controls
    // belong to a chosen/entered item, not to a still-open search.
    expect(queryByTestId('qty')).toBeNull()
    expect(queryByTestId('toggle-save-to-foods')).toBeNull()
    expect(queryByTestId('link-barcode-button')).toBeNull()
    expect(queryByTestId('add-item-button')).toBeNull()
    fireEvent.press(getByText('Banana'))
    expect(getByTestId('qty')).toBeTruthy()
    expect(getByTestId('add-item-button')).toBeTruthy()
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

  it('shows an editable "weight per pack" field as soon as a food is picked, before editing', async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'cauliflower')
    await waitFor(() => getByText('Cauliflower'))
    fireEvent.press(getByText('Cauliflower'))
    expect(queryByTestId('edit-product-button')).toBeTruthy() // still unedited
    expect(getByText(/Weight per pack/)).toBeTruthy()
    expect(getByTestId('weight-input')).toBeTruthy()
  })

  it('shows a calories-per-100g field for a free item with no match and uses it', async () => {
    const onAdd = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Grandmas Stew')
    const per100 = await waitFor(() => getByTestId('nf-kcal'))
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
    expect(queryByTestId('weight-input')).toBeNull()
    expect(queryByTestId('nf-kcal')).toBeNull()
  })

  it('does not show custom-entry fields while a matching suggestion is still available to pick', async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'banana')
    await waitFor(() => getByText('Banana')) // a match is available to pick
    // Nothing to add-your-own here — the user hasn't committed to anything yet.
    expect(queryByTestId('weight-input')).toBeNull()
    expect(queryByTestId('nf-kcal')).toBeNull()
  })

  it('reveals quantity, toggles, and the add button once search settles with no match', async () => {
    const { getByTestId, findByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    await findByTestId('nf-kcal') // search settled with zero matches -> custom-add card shown
    expect(getByTestId('qty')).toBeTruthy()
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
    expect(getByTestId('add-item-button')).toBeTruthy()
  })

  it('labels the weight field "per pack"', async () => {
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    await waitFor(() => getByText('Weight per pack (g)'))
  })
})

describe('AddItemSheet — validation guard', () => {
  it('does not add when weight is empty, and adds once weight is set', async () => {
    const onAdd = jest.fn()
    const { getByTestId } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Mystery Soup')
    await waitFor(() => getByTestId('nf-kcal'))
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
  const { getByTestId } = render(
    <ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>
      <AddItemSheet visible product={product} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    </ThemeProvider>
  )
  fireEvent.press(getByTestId('add-item-button'))
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
    expect(getByTestId('scanned-name-input')).toBeTruthy()
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

  it('shows Save to My Foods (default on) but hides Keep-scanning + Edit on a manual add (not scanned)', async () => {
    const { getByTestId, queryByTestId, findByTestId } = render(
      <AddItemSheet visible product={null} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Something')
    await findByTestId('nf-kcal') // search settled with zero matches -> reveal the toggle group
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
  it('reads "Update <name>" when the food already exists in My Foods', async () => {
    const custom = [{ id: 'cf1', name: 'Kale', emoji: '🥬', kcalPer100g: 33, createdAt: 1, updatedAt: 1 }]
    const { getByTestId, getByText } = render(
      <AddItemSheet visible product={null} customFoods={custom} onAdd={() => {}} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Kale')
    await waitFor(() => getByText('Kale')) // suggestion for the existing custom food
    fireEvent.press(getByText('Kale'))
    fireEvent.changeText(getByTestId('weight-input'), '200') // edit -> dirty -> toggle appears
    expect(getByText(/Update .Kale./)).toBeTruthy()
  })

  it('links a scanned barcode to the food being saved', async () => {
    const onAdd = jest.fn()
    const onScanForBarcode = jest.fn(() => Promise.resolve('50000001'))
    const { getByTestId, findByText } = render(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} onScanForBarcode={onScanForBarcode} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Home Hummus')
    fireEvent.press(await findByText('Link a barcode')) // search settled with no match
    expect(await findByText('Barcode linked ✓')).toBeTruthy()
  })

  it('resets to default ON when the sheet reopens for a new item, even after being turned off', async () => {
    const onAdd = jest.fn()
    const { getByTestId, rerender } = render(
      <AddItemSheet visible={false} product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    rerender(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'placeholder')
    await waitFor(() => getByTestId('toggle-save-to-foods')) // search settled -> toggle group revealed
    fireEvent.press(getByTestId('toggle-save-to-foods')) // true -> false
    // Close, then reopen fresh (as App.tsx does between adds) — should default back to on.
    rerender(
      <AddItemSheet visible={false} product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    rerender(
      <AddItemSheet visible product={null} onAdd={onAdd} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Fresh Item')
    await waitFor(() => getByTestId('nf-kcal'))
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

  it('always shows the save toggle for a fully-custom typed item', async () => {
    const { getByTestId, findByTestId } = render(
      <AddItemSheet visible product={null} onAdd={jest.fn()} onClose={() => {}} basis="per100g" onBasisChange={() => {}} />
    )
    fireEvent.changeText(getByTestId('manual-name-input'), 'Home Hummus')
    await findByTestId('nf-kcal') // search settled with zero matches -> custom-add card shown
    expect(getByTestId('toggle-save-to-foods')).toBeTruthy()
  })
})
