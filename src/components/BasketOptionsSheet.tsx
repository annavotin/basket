import React, { useMemo } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Stepper from './settings/Stepper'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { addDays, formatLong } from '../utils/dates'
import { cycleBudget } from '../utils/nutrition'

type Props = {
  visible: boolean
  dayCount: number
  startDate: string
  dailyGoal: number
  onDaysChange: (days: number) => void
  onDelete: () => void
  onClose: () => void
}

export default function BasketOptionsSheet({ visible, dayCount, startDate, dailyGoal, onDaysChange, onDelete, onClose }: Props) {
  const colors = useColors()
  const styles = useMemo(() => StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    scrimFill: { flex: 1 },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    title: { fontFamily: fonts.head, fontSize: 19, color: colors.forest, marginBottom: 14 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 9 },
    rowLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    foot: { fontFamily: fonts.body, fontSize: 12, color: colors.mossFaint, marginBottom: 14 },
    del: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, marginTop: 4 },
    delTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.roseDeep },
  }), [colors])

  const end = addDays(startDate, Math.max(0, dayCount - 1))
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title}>Basket options</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prep length</Text>
            <Stepper value={dayCount} min={1} max={14} onChange={onDaysChange} testID="prep-days" />
          </View>
          <Text style={styles.foot}>
            {formatLong(startDate)} → {formatLong(end)} · {cycleBudget(dayCount, dailyGoal).toLocaleString()} kcal budget
          </Text>
          <TouchableOpacity style={styles.del} onPress={onDelete} testID="delete-basket">
            <Text style={styles.delTxt}>Delete basket</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
