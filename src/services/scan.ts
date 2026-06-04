import * as ImagePicker from 'expo-image-picker'
import { CameraView, Camera } from 'expo-camera'
import { ReceiptLine } from '../types'
import { getMockReceiptLines } from '../mockReceipts'

let activeSub: { remove: () => void } | null = null

/**
 * Scan a real product barcode using expo-camera's NATIVE modern scanner
 * (iOS 16+ DataScannerViewController / Android Google Code Scanner) via
 * `launchScanner` + `onModernBarcodeScanned`.
 *
 * We deliberately do NOT use the inline `<CameraView onBarcodeScanned>` path:
 * it is broadly broken on iOS in Expo Go (the camera preview renders but the
 * callback never fires — see expo/expo#26658). The modern scanner presents its
 * own full-screen native UI, so no React camera view/Modal is needed here.
 *
 * Resolves with the scanned barcode string, or null if permission is denied or
 * the modern scanner isn't available (e.g. iOS < 16 / web — caller should fall
 * back to manual entry).
 */
export async function scanBarcodeWithCamera(): Promise<string | null> {
  // Drop any listener left over from a previously cancelled scan.
  activeSub?.remove()
  activeSub = null

  const { granted } = await Camera.requestCameraPermissionsAsync()
  if (!granted) return null
  if (!CameraView.isModernBarcodeScannerAvailable) return null

  return new Promise<string | null>((resolve) => {
    let settled = false
    const finish = async (value: string | null) => {
      if (settled) return
      settled = true
      activeSub?.remove()
      activeSub = null
      try {
        await CameraView.dismissScanner()
      } catch {
        // ignore — scanner may already be dismissed
      }
      resolve(value)
    }

    activeSub = CameraView.onModernBarcodeScanned((event) => {
      finish(event.data ?? null)
    })

    CameraView.launchScanner({
      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14'],
      isHighlightingEnabled: true,
    }).catch(() => finish(null))
  })
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
