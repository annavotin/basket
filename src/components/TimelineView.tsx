import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { dateToIndex, daysBetween, addDays } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'

type Props = {
  cycles: MealPrepCycle[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
  onCreatePeriod: (startDate: string) => void
  dayWidth: number
}

const BAR_HEIGHT = 36
const ROW_HEIGHT = BAR_HEIGHT + 16

export default function TimelineView({
  cycles,
  windowStart,
  totalDays,
  activeCycleId,
  onCyclePress,
  onCreatePeriod,
  dayWidth,
}: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
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
  }), [colors])

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
              { left: i * dayWidth, width: dayWidth, top: 8 },
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
              { left, width, top: 8 },
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

    </View>
  )
}
