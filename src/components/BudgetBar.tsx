import React from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  mealPrepKcal: number
  extraKcal: number
  budgetKcal: number
}

export default function BudgetBar({ mealPrepKcal, extraKcal, budgetKcal }: Props) {
  const budget = budgetKcal > 0 ? budgetKcal : 1
  const greenRatio = Math.min(mealPrepKcal, budget) / budget
  const pinkRatio = Math.min(extraKcal, Math.max(0, budget - mealPrepKcal)) / budget
  const greenPct: DimensionValue = `${Math.round(greenRatio * 100)}%`
  const pinkPct: DimensionValue = `${Math.round(pinkRatio * 100)}%`

  return (
    <View style={styles.container} testID="budget-bar">
      <Text style={styles.label}>
        {mealPrepKcal + extraKcal} / {budgetKcal} kcal
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, styles.green, { width: greenPct }]} testID="budget-bar-fill" />
        <View style={[styles.fill, styles.pink, { width: pinkPct }]} testID="budget-bar-extra-fill" />
      </View>
      <View style={styles.legend}>
        <View style={[styles.dot, styles.green]} />
        <Text style={styles.legendText}>Meal prep</Text>
        <View style={[styles.dot, styles.pink]} />
        <Text style={styles.legendText}>Extra</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.kcalText, marginBottom: 6 },
  track: {
    height: 10, borderRadius: 5, backgroundColor: '#FFFFFF',
    overflow: 'hidden', flexDirection: 'row',
  },
  fill: { height: '100%' },
  green: { backgroundColor: colors.cycleBar },
  pink: { backgroundColor: colors.extraPill },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 11, color: colors.monthText, marginRight: 12 },
})
