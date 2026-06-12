import React, { useMemo } from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'

type Props = {
  mealPrepKcal: number
  pantryKcal: number
  extraKcal: number
  budgetKcal: number
}

export default function BudgetBar({ mealPrepKcal, pantryKcal, extraKcal, budgetKcal }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.kcalText, marginBottom: 6 },
    track: {
      height: 10, borderRadius: 5, backgroundColor: '#FFFFFF',
      overflow: 'hidden', flexDirection: 'row',
    },
    fill: { height: '100%' },
    green: { backgroundColor: colors.cycleBar },
    amber: { backgroundColor: colors.pantry },
    pink: { backgroundColor: colors.extraPill },
    legend: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
    legendText: { fontSize: 11, color: colors.monthText, marginRight: 12 },
  }), [colors])

  const budget = budgetKcal > 0 ? budgetKcal : 1
  const greenRatio = Math.min(mealPrepKcal, budget) / budget
  const afterGreen = Math.max(0, budget - mealPrepKcal)
  const pantryRatio = Math.min(pantryKcal, afterGreen) / budget
  const afterPantry = Math.max(0, budget - mealPrepKcal - pantryKcal)
  const pinkRatio = Math.min(extraKcal, afterPantry) / budget
  const greenPct: DimensionValue = `${Math.round(greenRatio * 100)}%`
  const pantryPct: DimensionValue = `${Math.round(pantryRatio * 100)}%`
  const pinkPct: DimensionValue = `${Math.round(pinkRatio * 100)}%`

  return (
    <View style={styles.container} testID="budget-bar">
      <Text style={styles.label}>
        {formatEnergy(mealPrepKcal + pantryKcal + extraKcal, units)} / {formatEnergy(budgetKcal, units)}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, styles.green, { width: greenPct }]} testID="budget-bar-fill" />
        <View style={[styles.fill, styles.amber, { width: pantryPct }]} testID="budget-bar-pantry-fill" />
        <View style={[styles.fill, styles.pink, { width: pinkPct }]} testID="budget-bar-extra-fill" />
      </View>
      <View style={styles.legend}>
        <View style={[styles.dot, styles.green]} />
        <Text style={styles.legendText}>Meal prep</Text>
        <View style={[styles.dot, styles.amber]} />
        <Text style={styles.legendText}>Pantry</Text>
        <View style={[styles.dot, styles.pink]} />
        <Text style={styles.legendText}>Extra</Text>
      </View>
    </View>
  )
}
