import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { addDays, formatDay, weekdayShort } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  windowStart: string
  totalDays: number
  today: string
  extraDates: string[]
  dayWidth: number
  onExtraPress: (date: string) => void
  activeExtraDate?: string | null
}

export default function CalendarStrip({
  windowStart,
  totalDays,
  today,
  extraDates,
  dayWidth,
  onExtraPress,
  activeExtraDate,
}: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingVertical: 8,
    },
    cell: {
      alignItems: 'center',
    },
    // Round marker above each day: a faint "+" on empty days, a solid dot on days with extras.
    marker: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    markerEmpty: { backgroundColor: colors.rose + '38' },
    markerHas: { backgroundColor: colors.rose },
    markerActive: { borderWidth: 2, borderColor: colors.roseDeep },
    plus: { fontSize: 15, fontWeight: '600', color: colors.roseDeep },
    innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.roseDeep },
    dcell: {
      width: 46,
      paddingVertical: 8,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dcellToday: { backgroundColor: colors.forest },
    wd: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.moss,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    wdToday: { color: colors.matcha },
    dn: {
      fontFamily: fonts.head,
      fontWeight: '600',
      fontSize: 18,
      color: colors.forest,
      marginTop: 1,
    },
    dnToday: { color: '#FFFFFF' },
  }), [colors])

  const days = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))
  const extraSet = new Set(extraDates)

  return (
    <View style={styles.row}>
      {days.map((date) => {
        const { day } = formatDay(date)
        const wd = weekdayShort(date)
        const isToday = date === today
        const hasExtra = extraSet.has(date)
        return (
          <View key={date} testID="day-cell" style={[styles.cell, { width: dayWidth }]}>
            {hasExtra ? (
              <TouchableOpacity
                testID="extra-pill"
                style={[styles.marker, styles.markerHas, date === activeExtraDate && styles.markerActive]}
                onPress={() => onExtraPress(date)}
              >
                <View style={styles.innerDot} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="add-extra"
                style={[styles.marker, styles.markerEmpty]}
                onPress={() => onExtraPress(date)}
              >
                <Text style={styles.plus}>+</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.dcell, isToday && styles.dcellToday]}>
              <Text style={[styles.wd, isToday && styles.wdToday]}>{wd}</Text>
              <Text style={[styles.dn, isToday && styles.dnToday]}>{day}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}
