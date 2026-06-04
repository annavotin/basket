import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { addDays, formatDay } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  windowStart: string
  totalDays: number
  today: string
  extraDates: string[]
  dayWidth: number
}

export default function CalendarStrip({
  windowStart,
  totalDays,
  today,
  extraDates,
  dayWidth,
}: Props) {
  const days = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))
  const extraSet = new Set(extraDates)

  return (
    <View style={styles.row}>
      {days.map((date) => {
        const { day, month } = formatDay(date)
        const isToday = date === today
        const hasExtra = extraSet.has(date)
        return (
          <View key={date} testID="day-cell" style={[styles.cell, { width: dayWidth }]}>
            {hasExtra ? (
              <View style={styles.extraPill}>
                <Text style={styles.extraText}>Extra</Text>
              </View>
            ) : (
              <View style={styles.extraPlaceholder} />
            )}
            <View style={[styles.dateBox, isToday && styles.dateBoxToday]}>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
              <Text style={[styles.monthLabel, isToday && styles.monthLabelToday]}>{month}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
  },
  cell: {
    alignItems: 'center',
  },
  extraPlaceholder: {
    height: 24,
  },
  extraPill: {
    backgroundColor: colors.extraPill,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 24,
    justifyContent: 'center',
  },
  extraText: {
    color: colors.extraPillText,
    fontSize: 11,
    fontWeight: '600',
  },
  dateBox: {
    width: 48,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dateBoxToday: {
    backgroundColor: colors.selectedDay,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dayText,
  },
  dayNumToday: {
    color: colors.selectedDayText,
  },
  monthLabel: {
    fontSize: 12,
    color: colors.monthText,
  },
  monthLabelToday: {
    color: colors.selectedDayText,
  },
})
