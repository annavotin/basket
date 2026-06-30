import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { addDays, formatDay } from '../utils/dates'
import { BarcodeIcon, ReceiptIcon } from './icons'
import RadialDrumPicker from './RadialDrumPicker'

export const MIN_DAYS = 1
export const MAX_DAYS = 14

type Props = {
  dayCount: number
  startDate: string
  dailyGoal: number
  onDaysChange: (days: number) => void
  onDaysPreview?: (days: number) => void
  onScanBarcode: () => void
  onScanReceipt: () => void
}

export default function NewPeriodPanel({
  dayCount,
  startDate,
  dailyGoal,
  onDaysChange,
  onDaysPreview,
  onScanBarcode,
  onScanReceipt,
}: Props) {
  const colors = useColors()
  const { height: winH } = useWindowDimensions()

  // Reserve space for: safe area (~47) + header (~72) + calendar strip (~120) +
  // BudgetBar (~90) + detailArea paddingTop (20) + panel's own fixed chrome (~200).
  // Clamp so the disc has enough room on small screens and doesn't over-expand on large ones.
  const drumH = Math.max(120, Math.min(220, winH - 549))

  const styles = useMemo(() => StyleSheet.create({
    container: { paddingHorizontal: 16, paddingTop: 18 },

    // Scan cards — side by side
    scanRow: { flexDirection: 'row', gap: 10 },
    card: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14,
    },
    cardReceipt: { backgroundColor: colors.forest },
    cardBarcode: {
      backgroundColor: colors.white,
      shadowColor: '#2C3A1E', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    icon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    iconOnDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
    iconOnLight: { backgroundColor: colors.sageBg2 },
    cardTitle: { fontFamily: fonts.display, fontSize: 14, fontWeight: '600', flexShrink: 1 },
    cardTitleDark: { color: colors.white },
    cardTitleLight: { color: colors.forest },

    // Prep-length card
    prep: {
      backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
      marginTop: 14,
      shadowColor: '#2C3A1E', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    prepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    prepLabel: { fontFamily: fonts.display, fontSize: 16, fontWeight: '600', color: colors.forest },
    prepValue: { fontFamily: fonts.num, fontSize: 22, color: colors.matchaDeep },
    prepUnit: { fontSize: 14, fontWeight: '600', color: colors.moss },
    drumWrap: { marginHorizontal: -18, marginTop: 12 },
    foot: {
      fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.moss,
      textAlign: 'center', marginTop: 12, paddingTop: 12,
      borderTopWidth: 1.5, borderTopColor: colors.line,
    },
  }), [colors])

  const end = addDays(startDate, Math.max(0, dayCount - 1))
  const a = formatDay(startDate)
  const b = formatDay(end)
  const budget = (dayCount * dailyGoal).toLocaleString()

  return (
    <View style={styles.container} testID="new-period-panel">
      <View style={styles.scanRow}>
        <TouchableOpacity testID="scan-receipt" style={[styles.card, styles.cardReceipt]} onPress={onScanReceipt} activeOpacity={0.85}>
          <View style={[styles.icon, styles.iconOnDark]}><ReceiptIcon size={18} color={colors.white} /></View>
          <Text style={[styles.cardTitle, styles.cardTitleDark]} numberOfLines={2}>Scan a receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="scan-barcode" style={[styles.card, styles.cardBarcode]} onPress={onScanBarcode} activeOpacity={0.85}>
          <View style={[styles.icon, styles.iconOnLight]}><BarcodeIcon size={18} color={colors.forest} /></View>
          <Text style={[styles.cardTitle, styles.cardTitleLight]} numberOfLines={2}>Scan a barcode</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.prep}>
        <View style={styles.prepTop}>
          <Text style={styles.prepLabel}>Prep length</Text>
          <Text style={styles.prepValue}>
            {dayCount} <Text style={styles.prepUnit}>{dayCount === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
        <View style={styles.drumWrap}>
          <RadialDrumPicker value={dayCount} min={MIN_DAYS} max={MAX_DAYS} onChange={onDaysChange} onPreviewChange={onDaysPreview} height={drumH} />
        </View>
        <Text style={styles.foot}>
          {a.day} {a.month} → {b.day} {b.month} · {budget} kcal budget
        </Text>
      </View>
    </View>
  )
}
