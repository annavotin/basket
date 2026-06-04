import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle, ExtraMeal } from '../types'
import { dateToIndex, daysBetween, addDays } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  cycles: MealPrepCycle[]
  extraMeals: ExtraMeal[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
  onCreatePeriod: (startDate: string) => void
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
  onCreatePeriod,
  dayWidth,
}: Props) {
  const totalWidth = totalDays * dayWidth

  // Set of ISO dates covered by an existing cycle.
  const covered = new Set<string>()
  cycles.forEach((cycle) => {
    const span = daysBetween(cycle.startDate, cycle.endDate)
    for (let d = 0; d <= span; d++) {
      covered.add(addDays(cycle.startDate, d))
    }
  })

  const allDays = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {allDays.map((date, i) => {
        if (covered.has(date)) return null
        return (
          <TouchableOpacity
            key={`slot-${date}`}
            testID="empty-slot"
            onPress={() => onCreatePeriod(date)}
            style={[
              styles.emptySlot,
              { left: i * dayWidth, width: dayWidth, top: EXTRA_HEIGHT + 8 },
            ]}
          >
            <Text style={styles.plus}>+</Text>
          </TouchableOpacity>
        )
      })}

      {cycles.map((cycle) => {
        const startIdx = dateToIndex(windowStart, cycle.startDate)
        const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
        const left = startIdx * dayWidth
        const width = spanDays * dayWidth - 4
        const isActive = cycle.id === activeCycleId
        const isEmpty = cycle.items.length === 0
        return (
          <TouchableOpacity
            key={cycle.id}
            testID="cycle-bar"
            onPress={() => onCyclePress(cycle.id)}
            style={[
              styles.bar,
              { left, width, top: EXTRA_HEIGHT + 8 },
              isEmpty && styles.barNew,
              isActive && styles.barActive,
            ]}
          >
            <Text style={[styles.barLabel, isEmpty && styles.barLabelNew]} numberOfLines={1}>
              {isEmpty ? 'New shop' : 'Meal Prep'}
            </Text>
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
  emptySlot: {
    position: 'absolute',
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: colors.cycleBorder,
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.5,
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
  barNew: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.cycleBorder,
  },
  barActive: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.selectedDay,
  },
  barLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  barLabelNew: {
    color: colors.cycleBorder,
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
