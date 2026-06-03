import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle, ExtraMeal } from '../types'
import { dateToIndex, daysBetween } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  cycles: MealPrepCycle[]
  extraMeals: ExtraMeal[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
  dayWidth: number
}

const BAR_HEIGHT = 36
const EXTRA_HEIGHT = 24
const ROW_HEIGHT = BAR_HEIGHT + EXTRA_HEIGHT + 16

export default function TimelineView({
  cycles,
  extraMeals,
  windowStart,
  totalDays,
  activeCycleId,
  onCyclePress,
  dayWidth,
}: Props) {
  const totalWidth = totalDays * dayWidth

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {cycles.map((cycle) => {
        const startIdx = dateToIndex(windowStart, cycle.startDate)
        const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
        const left = startIdx * dayWidth
        const width = spanDays * dayWidth - 4
        const isActive = cycle.id === activeCycleId
        return (
          <TouchableOpacity
            key={cycle.id}
            testID="cycle-bar"
            onPress={() => onCyclePress(cycle.id)}
            style={[
              styles.bar,
              { left, width, top: EXTRA_HEIGHT + 8 },
              isActive && styles.barActive,
            ]}
          >
            <Text style={styles.barLabel} numberOfLines={1}>Meal Prep</Text>
          </TouchableOpacity>
        )
      })}

      {extraMeals.map((extra) => {
        const idx = dateToIndex(windowStart, extra.date)
        const left = idx * dayWidth + 4
        return (
          <View
            key={extra.id}
            testID="extra-pill"
            style={[styles.extraPill, { left, top: 4 }]}
          >
            <Text style={styles.extraPillText} numberOfLines={1}>{extra.name}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    height: BAR_HEIGHT,
    backgroundColor: colors.cycleBar,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cycleBorder,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  barActive: {
    borderWidth: 2,
    borderColor: colors.selectedDay,
  },
  barLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  extraPill: {
    position: 'absolute',
    height: EXTRA_HEIGHT,
    backgroundColor: colors.extraPill,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    maxWidth: 120,
  },
  extraPillText: {
    color: colors.extraPillText,
    fontSize: 11,
    fontWeight: '500',
  },
})
