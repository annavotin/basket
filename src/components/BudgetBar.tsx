import React, { useMemo } from 'react'
import { View, Text, StyleSheet, DimensionValue } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'
import { Macros, MacroTargets } from '../types'

// Translucent macro-bar track tints (rose / amber / matcha), from the design CSS.
const MACRO_TRACK = { protein: 'rgba(180,92,124,.18)', carbs: 'rgba(230,162,60,.20)', fat: 'rgba(124,201,110,.22)' }

type Props = {
  mealPrepKcal: number
  pantryKcal: number
  extraKcal: number
  budgetKcal: number
  macros?: Macros
  macroTargets?: MacroTargets
  days?: number
}

export default function BudgetBar({ mealPrepKcal, pantryKcal, extraKcal, budgetKcal, macros, macroTargets, days }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    // One white rounded card
    container: {
      backgroundColor: colors.white,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      marginHorizontal: 16,
      marginTop: 4,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    // Headline row: big consumed + "/ budget" on left, "X left" on right
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
    total: { fontFamily: fonts.head, fontSize: 14, fontWeight: '600', color: colors.moss },
    totalBold: { fontFamily: fonts.num, fontSize: 30, fontWeight: '600', color: colors.forest },
    left: { fontFamily: fonts.num, fontSize: 13, fontWeight: '600', color: colors.matchaDeep },
    // Stacked bar
    track: {
      height: 12, borderRadius: 6, backgroundColor: colors.sage100,
      overflow: 'hidden', flexDirection: 'row',
    },
    fill: { height: '100%' },
    green: { backgroundColor: colors.matcha },
    amber: { backgroundColor: colors.pantry },
    pink: { backgroundColor: colors.rose },
    // Legend
    legend: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
    dot: { width: 9, height: 9, borderRadius: 3, marginRight: 5 },
    legendText: { fontSize: 11.5, fontWeight: '700', color: colors.moss, marginRight: 16 },
    legendTextExtra: { fontSize: 11.5, fontWeight: '700', color: colors.roseDeep, marginRight: 16 },
    // Divider
    divider: { height: 1, backgroundColor: colors.line, marginTop: 14, marginBottom: 12 },
    // Macros row
    macrosRow: { flexDirection: 'row', gap: 14 },
    macroCol: { flex: 1 },
    macroHead: { marginBottom: 5 },
    macroName: { fontSize: 10.5, fontWeight: '700', color: colors.moss, letterSpacing: 0.3 },
    macroNums: { fontFamily: fonts.num, fontSize: 13, fontWeight: '600', color: colors.forest, marginTop: 2 },
    macroTarget: { color: colors.mossFaint, fontWeight: '600' },
    macroBar: { height: 6, borderRadius: 3 },
    macroFill: { height: '100%', borderRadius: 3 },
  }), [colors])

  const budget = budgetKcal > 0 ? budgetKcal : 1
  const consumed = mealPrepKcal + pantryKcal + extraKcal
  const greenRatio = Math.min(mealPrepKcal, budget) / budget
  const afterGreen = Math.max(0, budget - mealPrepKcal)
  const pantryRatio = Math.min(pantryKcal, afterGreen) / budget
  const afterPantry = Math.max(0, budget - mealPrepKcal - pantryKcal)
  const pinkRatio = Math.min(extraKcal, afterPantry) / budget
  const greenPct: DimensionValue = `${Math.round(greenRatio * 100)}%`
  const pantryPct: DimensionValue = `${Math.round(pantryRatio * 100)}%`
  const pinkPct: DimensionValue = `${Math.round(pinkRatio * 100)}%`

  const [consumedVal] = formatEnergy(consumed, units).split(' ')
  const [leftVal] = formatEnergy(Math.max(0, budgetKcal - consumed), units).split(' ')

  const macroDefs = macros && macroTargets && days
    ? [
        { label: 'PROTEIN', got: macros.protein, target: macroTargets.protein * days, color: colors.rose, track: MACRO_TRACK.protein },
        { label: 'CARBS', got: macros.carbs, target: macroTargets.carbs * days, color: colors.pantry, track: MACRO_TRACK.carbs },
        { label: 'FAT', got: macros.fat, target: macroTargets.fat * days, color: colors.matchaDeep, track: MACRO_TRACK.fat },
      ]
    : null

  return (
    <View style={styles.container} testID="budget-bar">
      {/* Kcal headline */}
      <View style={styles.top}>
        <Text style={styles.total}>
          <Text style={styles.totalBold}>{consumedVal}</Text> / {formatEnergy(budgetKcal, units)}
        </Text>
        <Text style={styles.left}>{leftVal} left</Text>
      </View>
      {/* Stacked bar: meal-prep (matcha green) / pantry (amber) / extra (terracotta rose) */}
      <View style={styles.track}>
        <View style={[styles.fill, styles.green, { width: greenPct }]} testID="budget-bar-fill" />
        <View style={[styles.fill, styles.amber, { width: pantryPct }]} testID="budget-bar-pantry-fill" />
        <View style={[styles.fill, styles.pink, { width: pinkPct }]} testID="budget-bar-extra-fill" />
      </View>
      {/* Legend — each source shows its kcal contribution so the total is traceable */}
      <View style={styles.legend}>
        <View style={[styles.dot, styles.green]} />
        <Text style={styles.legendText}>Meal prep</Text>
        {pantryKcal > 0 && (
          <>
            <View style={[styles.dot, styles.amber]} />
            <Text style={styles.legendText}>Pantry</Text>
          </>
        )}
        {extraKcal > 0 && (
          <>
            <View style={[styles.dot, styles.pink]} />
            <Text style={styles.legendTextExtra}>Extra</Text>
          </>
        )}
      </View>
      {/* Macros: protein (terracotta) / carbs (amber) / fat (matchaDeep green) */}
      {macroDefs && (
        <>
          <View style={styles.divider} />
          <View style={styles.macrosRow}>
            {macroDefs.map((m) => {
              const pct = Math.max(0, Math.min(100, (m.got / Math.max(1, m.target)) * 100))
              return (
                <View style={styles.macroCol} key={m.label}>
                  <View style={styles.macroHead}>
                    <Text style={styles.macroName}>{m.label}</Text>
                    <Text style={styles.macroNums}>
                      {Math.round(m.got)}<Text style={styles.macroTarget}>/{Math.round(m.target)}g</Text>
                    </Text>
                  </View>
                  <View style={[styles.macroBar, { backgroundColor: m.track }]}>
                    <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: m.color }]} />
                  </View>
                </View>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}
