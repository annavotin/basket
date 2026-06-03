import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { addDays, formatDay } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  windowStart: string
  totalDays: number
  selectedDate: string
  extraDates: string[]
  onDaySelect: (date: string) => void
  dayWidth: number
}

export default function CalendarStrip({
  windowStart,
  totalDays,
  selectedDate,
  extraDates,
  onDaySelect,
  dayWidth,
}: Props) {
  const days = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))
  const extraSet = new Set(extraDates)

  return (
    <View style={styles.row}>
      {days.map((date) => {
        const { day, month } = formatDay(date)
        const isSelected = date === selectedDate
        const hasExtra = extraSet.has(date)
        return (
          <TouchableOpacity
            key={date}
            testID="day-cell"
            onPress={() => onDaySelect(date)}
            style={[styles.cell, { width: dayWidth }]}
          >
            {hasExtra ? (
              <View style={styles.extraPill}>
                <Text style={styles.extraText}>Extra</Text>
              </View>
            ) : (
              <View style={styles.extraPlaceholder} />
            )}
            <View style={[styles.dateBox, isSelected && styles.dateBoxSelected]}>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day}</Text>
              <Text style={[styles.monthLabel, isSelected && styles.monthLabelSelected]}>{month}</Text>
            </View>
          </TouchableOpacity>
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
  dateBoxSelected: {
    backgroundColor: colors.selectedDay,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dayText,
  },
  dayNumSelected: {
    color: colors.selectedDayText,
  },
  monthLabel: {
    fontSize: 12,
    color: colors.monthText,
  },
  monthLabelSelected: {
    color: colors.selectedDayText,
  },
})
