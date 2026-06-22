import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Slider from '@react-native-community/slider'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { addDays, formatDay } from '../utils/dates'
import { BarcodeIcon, ReceiptIcon } from './icons'

export const MIN_DAYS = 1
export const MAX_DAYS = 14

type Props = {
  dayCount: number
  startDate: string
  dailyGoal: number
  onDaysChange: (days: number) => void
  onScanBarcode: () => void
  onScanReceipt: () => void
}

export default function NewPeriodPanel({
  dayCount,
  startDate,
  dailyGoal,
  onDaysChange,
  onScanBarcode,
  onScanReceipt,
}: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

    // Scan cards
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderRadius: 22, padding: 16, marginBottom: 11,
    },
    cardReceipt: { backgroundColor: colors.forest },
    cardBarcode: {
      backgroundColor: colors.white,
      shadowColor: '#2C3A1E', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    icon: {
      width: 52, height: 52, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center',
    },
    iconOnDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
    iconOnLight: { backgroundColor: colors.sageBg2 },
    iconEmoji: { fontSize: 26 },
    cardText: { flex: 1 },
    cardTitle: { fontFamily: fonts.head, fontSize: 17, fontWeight: '600' },
    cardTitleDark: { color: colors.white },
    cardTitleLight: { color: colors.forest },
    cardSub: { fontFamily: fonts.body, fontSize: 13, fontWeight: '600', marginTop: 2 },
    cardSubDark: { color: 'rgba(255,255,255,0.7)' },
    cardSubLight: { color: colors.mossFaint },

    // Prep-length card
    prep: {
      backgroundColor: colors.white, borderRadius: 22, padding: 18, marginTop: 4,
      shadowColor: '#2C3A1E', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    prepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    prepLabel: { fontFamily: fonts.head, fontSize: 16, fontWeight: '600', color: colors.forest },
    prepValue: { fontFamily: fonts.head, fontSize: 22, fontWeight: '700', color: colors.matchaDeep },
    prepUnit: { fontSize: 14, fontWeight: '600', color: colors.moss },
    slider: { width: '100%', height: 40, marginTop: 6 },
    scale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: -4 },
    scaleText: { fontSize: 12, fontWeight: '700', color: colors.mossFaint },
    foot: {
      fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.moss,
      textAlign: 'center', marginTop: 12,
    },
  }), [colors])

  const end = addDays(startDate, Math.max(0, dayCount - 1))
  const a = formatDay(startDate)
  const b = formatDay(end)
  const budget = (dayCount * dailyGoal).toLocaleString()

  return (
    <View style={styles.container} testID="new-period-panel">
      <TouchableOpacity testID="scan-receipt" style={[styles.card, styles.cardReceipt]} onPress={onScanReceipt} activeOpacity={0.85}>
        <View style={[styles.icon, styles.iconOnDark]}><ReceiptIcon size={24} color={colors.white} /></View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, styles.cardTitleDark]}>Scan a receipt</Text>
          <Text style={[styles.cardSub, styles.cardSubDark]}>Add a whole shop in one tap</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity testID="scan-barcode" style={[styles.card, styles.cardBarcode]} onPress={onScanBarcode} activeOpacity={0.85}>
        <View style={[styles.icon, styles.iconOnLight]}><BarcodeIcon size={24} color={colors.forest} /></View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, styles.cardTitleLight]}>Scan a barcode</Text>
          <Text style={[styles.cardSub, styles.cardSubLight]}>Add items one at a time</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.prep}>
        <View style={styles.prepTop}>
          <Text style={styles.prepLabel}>Prep length</Text>
          <Text style={styles.prepValue}>
            {dayCount} <Text style={styles.prepUnit}>{dayCount === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
        <Slider
          testID="day-slider"
          style={styles.slider}
          minimumValue={MIN_DAYS}
          maximumValue={MAX_DAYS}
          step={1}
          value={dayCount}
          onValueChange={(v) => onDaysChange(Math.round(v))}
          minimumTrackTintColor={colors.matcha}
          maximumTrackTintColor={colors.sage100}
          thumbTintColor={colors.matcha}
        />
        <View style={styles.scale}>
          <Text style={styles.scaleText}>1</Text>
          <Text style={styles.scaleText}>7</Text>
          <Text style={styles.scaleText}>14</Text>
        </View>
        <Text style={styles.foot}>
          {a.day} {a.month} → {b.day} {b.month} · {budget} kcal budget
        </Text>
      </View>
    </View>
  )
}
