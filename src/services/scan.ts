import * as ImagePicker from 'expo-image-picker'
import { pickRandomProduct, Product } from '../mockProducts'
import { ReceiptLine } from '../types'
import { getMockReceiptLines } from '../mockReceipts'

/**
 * Phase-1 simulation: let the user pick a photo (stand-in for pointing the
 * camera at a barcode), then return a mock product. Returns null if the user
 * cancels. Real camera + barcode decode + Open Food Facts come later behind
 * this same signature.
 */
export async function simulateBarcodeScan(): Promise<Product | null> {
  try {
    await ImagePicker.requestMediaLibraryPermissionsAsync()
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    })
    if (result.canceled) return null
    return pickRandomProduct()
  } catch {
    // If the picker is unavailable for any reason, fall back to a product so
    // the flow is still demoable.
    return pickRandomProduct()
  }
}

/**
 * Phase-2 simulation: let the user pick a photo (stand-in for photographing a
 * receipt), then return mock extracted line items. Returns null if cancelled.
 * Real OCR / vision-LLM comes later behind this same signature.
 */
export async function simulateReceiptScan(): Promise<ReceiptLine[] | null> {
  try {
    await ImagePicker.requestMediaLibraryPermissionsAsync()
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    })
    if (result.canceled) return null
    return getMockReceiptLines()
  } catch {
    return getMockReceiptLines()
  }
}
