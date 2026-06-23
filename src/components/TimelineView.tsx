import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
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
const ROW_HEIGHT = PILL_HEIGHT + 12

/**
 * Prep-selector row. Each cycle is a filled matcha pill ("Meal Prep" stocked / "New shop"
 * empty) with a cluster of its item emojis, positioned by date span (gantt-style) so it
 * sits under its days — and rendered INSIDE the calendar's horizontal scroll so the pills
 * scroll together with the day strip. A dashed `＋` tile (at the next free day) creates a prep.
 */
export default function TimelineView({
  cycles,
  windowStart,
  totalDays,
  activeCycleId,
  onCreatePeriod,
  onCyclePress,
  dayWidth,
}: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    container: { position: 'relative', marginTop: 4 },
    addTile: {
      position: 'absolute', top: 6, height: PILL_HEIGHT,
      borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.matcha,
      alignItems: 'center', justifyContent: 'center',
    },
    addPlus: { color: colors.matchaDeep, fontSize: 20, fontWeight: '600' },
    pill: {
      position: 'absolute', top: 6, height: PILL_HEIGHT,
      borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
      backgroundColor: colors.matcha, overflow: 'hidden',
      shadowColor: colors.forest, shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 4 },
    },
    pillActive: { borderWidth: 2.5, borderColor: colors.forest },
    pillLabel: { color: '#fff', fontFamily: fonts.display, fontWeight: '600', fontSize: 14, flexShrink: 1 },
    chips: { flexDirection: 'row', marginLeft: 10 },
    chip: {
      width: 25, height: 25, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center', justifyContent: 'center', marginLeft: -8,
    },
    chipText: { fontSize: 13 },
  }), [colors])

  const totalWidth = totalDays * dayWidth

  // First uncovered day at/after today (fall back to today, then window start) — where the
  // dashed `＋` tile sits and the new prep starts.
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

  const createIdx = Math.max(0, daysBetween(windowStart, createStart))

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {cycles.map((cycle) => {
        const startIdx = Math.max(0, daysBetween(windowStart, cycle.startDate))
        const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
        const left = startIdx * dayWidth + 4
        const width = spanDays * dayWidth - 8
        const isActive = cycle.id === activeCycleId
        const isEmpty = cycle.items.length === 0
        const emojis = cycle.items.slice(0, 3).map((it) => it.emoji)
        return (
          <TouchableOpacity
            key={cycle.id}
            testID="cycle-bar"
            onPress={() => onCyclePress(cycle.id)}
            style={[styles.pill, { left, width }, isActive && styles.pillActive]}
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

      <TouchableOpacity
        testID="create-period"
        accessibilityLabel="New prep"
        onPress={() => onCreatePeriod(createStart)}
        style={[styles.addTile, { left: createIdx * dayWidth + 4, width: dayWidth - 8 }]}
      >
        <Text style={styles.addPlus}>+</Text>
      </TouchableOpacity>
    </View>
  )
}
