import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { addDays, daysBetween, todayISO } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  cycles: MealPrepCycle[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
  onCreatePeriod: (startDate: string) => void
  dayWidth: number
}

const PILL_HEIGHT = 40

/**
 * Horizontal prep-selector pill row (replaces the old date-positioned timeline bars).
 * Each cycle is a pill — filled matcha→matcha600 with its label ("Meal Prep" for a
 * stocked cycle, "New shop" for an empty one) and a small cluster of the cycle's item
 * emojis on the right. A dashed `＋` tile fires the create-period handler. The whole row
 * scrolls horizontally if the pills overflow.
 */
export default function TimelineView({
  cycles,
  windowStart,
  totalDays,
  activeCycleId,
  onCreatePeriod,
  onCyclePress,
  dayWidth: _dayWidth,
}: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 4,
      gap: 9,
    },
    addTile: {
      height: PILL_HEIGHT,
      minWidth: 52,
      paddingHorizontal: 14,
      borderRadius: 13,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.matcha,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPlus: {
      color: colors.matchaDeep,
      fontSize: 20,
      fontWeight: '600',
    },
    pill: {
      height: PILL_HEIGHT,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      backgroundColor: colors.matcha,
      shadowColor: colors.forest,
      shadowOpacity: 0.22,
      shadowRadius: 11,
      shadowOffset: { width: 0, height: 4 },
    },
    pillActive: {
      borderWidth: 2.5,
      borderColor: colors.forest,
    },
    pillLabel: {
      color: '#fff',
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 14,
    },
    chips: {
      flexDirection: 'row',
      marginLeft: 10,
    },
    chip: {
      width: 25,
      height: 25,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
    },
    chipText: {
      fontSize: 13,
    },
  }), [colors])

  // The `＋` tile creates a new prep. Pick the first uncovered day at/after today (falling
  // back to today, then the window start) so a fresh prep lands on a sensible empty slot.
  const createStart = useMemo(() => {
    const covered = new Set<string>()
    cycles.forEach((cycle) => {
      const span = daysBetween(cycle.startDate, cycle.endDate)
      for (let d = 0; d <= span; d++) covered.add(addDays(cycle.startDate, d))
    })
    const today = todayISO()
    const start = today >= windowStart ? today : windowStart
    const startIdx = Math.max(0, daysBetween(windowStart, start))
    for (let i = startIdx; i < totalDays; i++) {
      const date = addDays(windowStart, i)
      if (!covered.has(date)) return date
    }
    return start
  }, [cycles, windowStart, totalDays])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      <TouchableOpacity
        testID="create-period"
        accessibilityLabel="New prep"
        onPress={() => onCreatePeriod(createStart)}
        style={styles.addTile}
      >
        <Text style={styles.addPlus}>+</Text>
      </TouchableOpacity>

      {cycles.map((cycle) => {
        const isActive = cycle.id === activeCycleId
        const isEmpty = cycle.items.length === 0
        const emojis = cycle.items.slice(0, 3).map((it) => it.emoji)
        return (
          <TouchableOpacity
            key={cycle.id}
            testID="cycle-bar"
            onPress={() => onCyclePress(cycle.id)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={styles.pillLabel} numberOfLines={1}>
              {isEmpty ? 'New shop' : 'Meal Prep'}
            </Text>
            {!isEmpty && emojis.length > 0 && (
              <View style={styles.chips}>
                {emojis.map((emoji, k) => (
                  <View key={k} style={styles.chip}>
                    <Text style={styles.chipText}>{emoji}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}
