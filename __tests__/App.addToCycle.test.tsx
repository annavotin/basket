import React from 'react'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'

// Keep the real camera (expo-camera) out of the jest module graph: stub the
// scan service so handleScanBarcode resolves a known barcode without launching
// any native scanner.
jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(async () => '0000000000001'),
  scanReceipt: jest.fn(async () => null),
}))

// Stub the product lookup so the barcode resolves to a deterministic product
// (mocking here in the test never touches src/services/foodApi.ts itself).
const LOOKED_UP_PRODUCT = {
  name: 'Greek Yogurt',
  emoji: '🥛',
  packageWeightG: 500,
  kcalPer100g: 59,
}
jest.mock('../src/services/foodApi', () => ({
  lookupBarcode: jest.fn(async () => LOOKED_UP_PRODUCT),
  searchProductsByName: jest.fn(async () => []),
}))

import AsyncStorage from '@react-native-async-storage/async-storage'
import App from '../App'

// Pin the clock so an existing cycle from src/data.ts is active regardless of
// the real date the suite runs on. cycle-1 runs 2026-05-31..2026-06-04 and
// already has items, so MealPrepDetail + AddFab render on this date.
const FIXED_NOW = new Date('2026-06-02T12:00:00Z')

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
  // Start each test from the demo seed: the persistence effect from a prior
  // test would otherwise have written cycles into the in-memory AsyncStorage
  // mock, which hydration would then restore.
  AsyncStorage.clear()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
  jest.clearAllMocks()
})

async function scanAndConfirmProduct(screen: ReturnType<typeof render>) {
  // Open the FAB menu and choose "Scan Barcode" — the realistic add path.
  fireEvent.press(screen.getByTestId('add-fab'))
  fireEvent.press(screen.getByTestId('fab-barcode'))

  // handleScanBarcode awaits the (mocked) scanner + lookup, then opens the sheet.
  await waitFor(() => expect(screen.getByTestId('add-item-sheet')).toBeTruthy())

  // Confirm the product into the active cycle.
  fireEvent.press(screen.getByTestId('add-item-button'))
}

describe('App scan -> add to active cycle', () => {
  it('adds the scanned product as a new food-item carrying its package weight/kcal', async () => {
    const screen = render(<App />)
    // Let the mount-time hydration effect (loadCycles) settle before interacting.
    await waitFor(() => expect(screen.getAllByTestId('food-item').length).toBeGreaterThan(0))
    const before = screen.getAllByTestId('food-item').length

    await scanAndConfirmProduct(screen)

    await waitFor(() =>
      expect(screen.getAllByTestId('food-item')).toHaveLength(before + 1)
    )

    // The new card (the appended last food-item row) shows the whole-package
    // weight (500g) and kcal (59 kcal/100g * 500g = 295kcal).
    const rows = screen.getAllByTestId('food-item')
    const newRow = within(rows[rows.length - 1])
    expect(newRow.getByText('Greek Yogurt')).toBeTruthy()
    expect(newRow.getByText('500 g · 295 kcal')).toBeTruthy()
  })

  it('removes a stocked item when deleted via the ItemDetail sheet', async () => {
    const screen = render(<App />)
    // Let the mount-time hydration effect (loadCycles) settle before interacting.
    await waitFor(() => expect(screen.getAllByTestId('food-item').length).toBeGreaterThan(0))

    const before = screen.getAllByTestId('food-item').length
    await scanAndConfirmProduct(screen)
    await waitFor(() =>
      expect(screen.getAllByTestId('food-item')).toHaveLength(before + 1)
    )

    const countWithNew = screen.getAllByTestId('food-item').length

    // Open the detail sheet for the newly added item (appended last).
    const rows = screen.getAllByTestId('food-item')
    fireEvent.press(within(rows[rows.length - 1]).getByTestId('edit-item'))

    // Tap "Remove from basket" then confirm deletion.
    fireEvent.press(screen.getByText('Remove from basket'))
    fireEvent.press(screen.getByText('Delete'))

    await waitFor(() =>
      expect(screen.getAllByTestId('food-item')).toHaveLength(countWithNew - 1)
    )
    // No remaining food-item row carries the removed product's metrics.
    const remaining = screen.getAllByTestId('food-item')
    remaining.forEach((row) => {
      expect(within(row).queryByText('500 g  295 kcal')).toBeNull()
    })
  })
})
