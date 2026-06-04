import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Product } from '../mockProducts'
import { lookupProductByBarcode } from '../services/foodApi'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  onResult: (product: Product | null, barcode: string) => void
  onClose: () => void
}

export default function BarcodeScannerModal({ visible, onResult, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const [looking, setLooking] = useState(false)
  const handledRef = useRef(false)

  // Reset the one-shot guard each time the scanner opens.
  useEffect(() => {
    if (visible) {
      handledRef.current = false
      setLooking(false)
    }
  }, [visible])

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission()
    }
  }, [visible, permission])

  async function handleScanned(barcode: string) {
    if (handledRef.current) return
    handledRef.current = true
    console.log('[barcode-scanner] detected:', barcode)
    setLooking(true)
    const product = await lookupProductByBarcode(barcode)
    console.log('[barcode-scanner] lookup result:', product ? product.name : 'not found')
    onResult(product, barcode)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        {permission?.granted ? (
          <>
            {/* CameraView must NOT have children (expo-camera renders the native
                scanner; nested RN children break barcode detection). The overlay
                is an absolutely-positioned sibling instead. */}
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={({ data }) => handleScanned(data)}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>
                {looking ? 'Looking up…' : 'Point at a barcode'}
              </Text>
              {looking && <ActivityIndicator color="#FFFFFF" style={{ marginTop: 12 }} />}
            </View>
          </>
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              Camera access is needed to scan barcodes.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000000' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 160,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 20 },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  permissionBtn: {
    backgroundColor: colors.cycleBar,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  cancel: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  cancelText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
})
