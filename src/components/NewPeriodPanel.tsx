import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Slider from '@react-native-community/slider'
import { colors } from '../styles/colors'

export const MIN_DAYS = 1
export const MAX_DAYS = 7

type Props = {
  dayCount: number
  onDaysChange: (days: number) => void
  onScanBarcode: () => void
  onScanReceipt: () => void
  onAddManual: () => void
}

export default function NewPeriodPanel({
  dayCount,
  onDaysChange,
  onScanBarcode,
  onScanReceipt,
  onAddManual,
}: Props) {
  return (
    <View style={styles.container} testID="new-period-panel">
      <View style={styles.header}>
        <Text style={styles.bag}>🛍️</Text>
        <Text style={styles.title}>New shop</Text>
      </View>

      <Text style={styles.daysLabel}>
        {dayCount} {dayCount === 1 ? 'day' : 'days'}
      </Text>
      <Slider
        testID="day-slider"
        style={styles.slider}
        minimumValue={MIN_DAYS}
        maximumValue={MAX_DAYS}
        step={1}
        value={dayCount}
        onValueChange={(v) => onDaysChange(Math.round(v))}
        minimumTrackTintColor={colors.selectedDay}
        maximumTrackTintColor="#CCCCCC"
        thumbTintColor={colors.selectedDay}
      />

      <View style={styles.scanRow}>
        <TouchableOpacity testID="scan-barcode" style={styles.scanCard} onPress={onScanBarcode}>
          <Text style={styles.scanText}>Scan{'\n'}Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="scan-receipt" style={styles.scanCard} onPress={onScanReceipt}>
          <Text style={styles.scanText}>Scan{'\n'}Receipt</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity testID="manual-add" style={styles.manualLink} onPress={onAddManual}>
        <Text style={styles.manualLinkText}>+ Add manually</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.detailBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    flex: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  bag: {
    fontSize: 44,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.kcalText,
  },
  daysLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.kcalText,
    marginBottom: 4,
  },
  slider: {
    width: '85%',
    height: 40,
    marginBottom: 20,
  },
  scanRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  scanCard: {
    flex: 1,
    backgroundColor: colors.itemCard,
    borderRadius: 16,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.kcalText,
    textAlign: 'center',
  },
  manualLink: { marginTop: 16, paddingVertical: 8 },
  manualLinkText: { fontSize: 15, fontWeight: '600', color: colors.selectedDay },
})
