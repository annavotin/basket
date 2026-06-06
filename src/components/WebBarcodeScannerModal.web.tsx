import React, { useEffect, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { WebBarcodeScannerModalProps } from './WebBarcodeScannerModal'

const READER_ID = 'web-barcode-reader'
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
]

export default function WebBarcodeScannerModal({
  visible,
  onScanned,
  onClose,
}: WebBarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (!visible) return
    handledRef.current = false
    let cancelled = false

    // Defer so the <div id> rendered from <View nativeID> exists in the DOM.
    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const scanner = new Html5Qrcode(READER_ID, { formatsToSupport: FORMATS, verbose: false })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (decodedText: string) => {
            if (handledRef.current) return
            handledRef.current = true
            onScanned(decodedText)
          },
          undefined
        )
      } catch {
        // Camera unavailable / permission denied — user can Cancel.
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
  }, [visible, onScanned])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        <View nativeID={READER_ID} style={styles.reader} />
        <Text style={styles.hint}>Point at a barcode</Text>
        <TouchableOpacity testID="web-scanner-cancel" style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  reader: { width: '100%', maxWidth: 480, aspectRatio: 1 },
  hint: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 16 },
  cancel: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28,
  },
  cancelText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
})
