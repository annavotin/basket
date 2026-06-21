import * as ImagePicker from 'expo-image-picker'
import { CameraView, Camera } from 'expo-camera'
import { ReceiptLine } from '../types'
import { supabase } from './supabase'
import { extractReceiptLines } from './receipt-extract'

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
      // Let the native scanner fully tear down before the caller presents a sheet,
      // otherwise iOS errors "already presenting DataScannerViewController" and the
      // Add-item sheet never appears.
      await new Promise((r) => setTimeout(r, 350))
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
 * Pick a receipt photo and extract line items via the `scan-receipt` Supabase Edge
 * Function (Claude Haiku vision). Returns the parsed lines for review, or null if the
 * user cancels, sync isn't configured, or extraction fails (caller falls back to manual).
 */
export async function scanReceipt(onExtractStart?: () => void): Promise<ReceiptLine[] | null> {
  try {
    await ImagePicker.requestMediaLibraryPermissionsAsync()
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (result.canceled) return null
    const asset = result.assets?.[0]
    if (!asset?.uri) return null
    if (!supabase) return null // local-only mode — no backend to call
    const sb = supabase
    onExtractStart?.() // image picked — extraction (resize + upload + Claude) starts now

    // Downscale before upload: full-res phone photos are multi-MB and time out over
    // cellular. Cap the long edge at 1600px (Claude downsamples to ~1568 anyway), JPEG q0.6.
    // Required lazily so the app still boots on a binary that predates this native module
    // (e.g. a JS reload before the next `expo run:ios`).
    const ImageManipulator = require('expo-image-manipulator') as typeof import('expo-image-manipulator')
    const w = asset.width ?? 0
    const h = asset.height ?? 0
    const target = Math.min(Math.max(w, h, 1), 1600)
    const resizeTo = h >= w ? { height: target } : { width: target }
    const shrunk = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: resizeTo }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    )
    if (!shrunk.base64) return null

    const image = { base64: shrunk.base64, mediaType: 'image/jpeg' }
    return extractReceiptLines(image, async (body) => {
      const { data, error } = await sb.functions.invoke('scan-receipt', { body })
      if (error) throw error
      return data
    })
  } catch {
    return null
  }
}
