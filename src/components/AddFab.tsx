import React, { useRef, useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { PlusIcon, EditIcon, BarcodeIcon, ReceiptIcon } from './icons'

type Props = {
  onScanBarcode?: () => void
  onScanReceipt?: () => void
  onAddManual: () => void
  manualOnly?: boolean
}

export default function AddFab({ onScanBarcode, onScanReceipt, onAddManual, manualOnly }: Props) {
  const colors = useColors()
  const [open, setOpen] = useState(false)
  const rotate = useRef(new Animated.Value(0)).current

  const styles = useMemo(() => StyleSheet.create({
    wrap: { position: 'absolute', right: 20, bottom: 6, alignItems: 'flex-end' },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.selectedDay,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    menu: { marginBottom: 12, alignItems: 'flex-end' },
    option: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 18,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    optionText: { fontSize: 15, fontWeight: '600', color: colors.kcalText },
  }), [colors])

  function toggle(next: boolean) {
    setOpen(next)
    Animated.timing(rotate, {
      toValue: next ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start()
  }

  function choose(fn: () => void) {
    toggle(false)
    fn()
  }

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] })

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {open && !manualOnly && (
        <View style={styles.menu}>
          <TouchableOpacity testID="fab-manual" style={styles.option} onPress={() => choose(onAddManual)}>
            <EditIcon size={18} color={colors.kcalText} />
            <Text style={styles.optionText}>Add Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="fab-barcode" style={styles.option} onPress={() => choose(() => onScanBarcode?.())}>
            <BarcodeIcon size={18} color={colors.kcalText} />
            <Text style={styles.optionText}>Scan Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="fab-receipt" style={styles.option} onPress={() => choose(() => onScanReceipt?.())}>
            <ReceiptIcon size={18} color={colors.kcalText} />
            <Text style={styles.optionText}>Scan Receipt</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity testID="add-fab" style={styles.fab} onPress={() => (manualOnly ? onAddManual() : toggle(!open))} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <PlusIcon size={28} color={colors.selectedDayText} strokeWidth={2.6} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  )
}
