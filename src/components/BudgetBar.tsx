import React from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  stockedKcal: number
  budgetKcal: number
}

export default function BudgetBar({ stockedKcal, budgetKcal }: Props) {
  const ratio = budgetKcal > 0 ? stockedKcal / budgetKcal : 0
  const pct: DimensionValue = `${Math.min(100, Math.round(ratio * 100))}%`

  return (
    <View style={styles.container} testID="budget-bar">
      <Text style={styles.label}>
        {stockedKcal} / {budgetKcal} kcal
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: pct }]} testID="budget-bar-fill" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.kcalText,
    marginBottom: 6,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.cycleBar,
  },
})
