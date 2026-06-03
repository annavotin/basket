import React, { useRef, useEffect, useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  StyleSheet,
} from 'react-native'
import CalendarStrip from './src/components/CalendarStrip'
import TimelineView from './src/components/TimelineView'
import MealPrepDetail from './src/components/MealPrepDetail'
import { cycles, extraMeals } from './src/data'
import { todayISO, addDays, daysBetween } from './src/utils/dates'
import { colors } from './src/styles/colors'

const DAY_WIDTH = 64
const TOTAL_DAYS = 45
const WINDOW_OFFSET = 7  // days before today the window starts

function getWindowStart(): string {
  return addDays(todayISO(), -WINDOW_OFFSET)
}

function findCycleForDate(date: string): string | null {
  const cycle = cycles.find(
    (c) => date >= c.startDate && date <= c.endDate
  )
  return cycle?.id ?? null
}

export default function App() {
  const today = useMemo(() => todayISO(), [])
  const windowStart = useMemo(() => getWindowStart(), [])

  const [selectedDate, setSelectedDate] = useState(today)
  const [activeCycleId, setActiveCycleId] = useState<string | null>(
    () => findCycleForDate(today)
  )
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const todayIndex = daysBetween(windowStart, today)
    const scrollX = Math.max(0, (todayIndex - 3) * DAY_WIDTH)
    scrollRef.current?.scrollTo({ x: scrollX, animated: false })
  }, [])

  function handleDaySelect(date: string) {
    setSelectedDate(date)
  }

  function handleCyclePress(id: string) {
    setActiveCycleId((prev) => (prev === id ? null : id))
  }

  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const extraDates = extraMeals.map((e) => e.date)

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={{ width: TOTAL_DAYS * DAY_WIDTH }}
        >
          <CalendarStrip
            windowStart={windowStart}
            totalDays={TOTAL_DAYS}
            selectedDate={selectedDate}
            extraDates={extraDates}
            onDaySelect={handleDaySelect}
            dayWidth={DAY_WIDTH}
          />
          <TimelineView
            cycles={cycles}
            extraMeals={extraMeals}
            windowStart={windowStart}
            totalDays={TOTAL_DAYS}
            activeCycleId={activeCycleId}
            onCyclePress={handleCyclePress}
            dayWidth={DAY_WIDTH}
          />
        </ScrollView>
        <MealPrepDetail activeCycle={activeCycle} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    color: colors.dayText,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
})
