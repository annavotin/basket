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
  dimmed?: boolean
}

export default function CalendarStrip({
  windowStart,
  totalDays,
  today,
  extraDates,
  dayWidth,
  onExtraPress,
  activeExtraDate,
  dimmed = false,
}: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    cell: {
      alignItems: 'center',
    },
    dcell: {
      width: 46,
      paddingTop: 8,
      // A touch more bottom room so the absolutely-positioned extra dot tucks in
      // without crowding the number — keeps the flat shape, dot or no dot.
      paddingBottom: 11,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: colors.sageBg2,
    },
    dcellToday: { backgroundColor: colors.forest },
    dcellActive: { borderWidth: 2, borderColor: colors.rose },
    wd: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.mossFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    wdToday: { color: colors.cream },
    wdActive: { color: colors.rose },
    dn: {
      fontFamily: fonts.num,
      fontWeight: '600',
      fontSize: 18,
      color: colors.forest,
      marginTop: 1,
    },
    dnToday: { color: colors.cream },
    dnActive: { color: colors.rose },
    extraDot: {
      position: 'absolute',
      bottom: 3,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.rose,
    },
    extraDotAlt: { backgroundColor: colors.cream },
  }), [colors])

  const days = Array.from({ length: totalDays }, (_, i) => addDays(windowStart, i))
  const extraSet = new Set(extraDates)

  return (
    <View style={[styles.row, dimmed && { opacity: 0.5 }]} pointerEvents={dimmed ? 'none' : 'auto'}>
      {days.map((date) => {
        const { day } = formatDay(date)
        const wd = weekdayShort(date)
        const isToday = date === today
        const hasExtra = extraSet.has(date)
        const isActive = date === activeExtraDate
        const alt = isToday || isActive
        return (
          <TouchableOpacity
            key={date}
            testID="day-cell"
            style={[styles.cell, { width: dayWidth }]}
            onPress={() => onExtraPress(date)}
            activeOpacity={0.7}
          >
            <View style={[styles.dcell, isToday && styles.dcellToday, isActive && !isToday && styles.dcellActive]}>
              <Text style={[styles.wd, isToday && styles.wdToday, isActive && !isToday && styles.wdActive]}>{wd}</Text>
              <Text style={[styles.dn, isToday && styles.dnToday, isActive && !isToday && styles.dnActive]}>{day}</Text>
              {hasExtra && <View style={[styles.extraDot, alt && styles.extraDotAlt]} />}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
