import React, { useRef, useEffect, useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  StyleSheet,
  Alert,
} from 'react-native'
import CalendarStrip from './src/components/CalendarStrip'
import TimelineView from './src/components/TimelineView'
import MealPrepDetail from './src/components/MealPrepDetail'
import NewPeriodPanel from './src/components/NewPeriodPanel'
import { cycles as initialCycles, extraMeals } from './src/data'
import { todayISO, addDays, daysBetween } from './src/utils/dates'
import { colors } from './src/styles/colors'

const DAY_WIDTH = 64
const TOTAL_DAYS = 45
const WINDOW_OFFSET = 7  // days before today the window starts
const DEFAULT_DAYS = 4

function getWindowStart(): string {
  return addDays(todayISO(), -WINDOW_OFFSET)
}

export default function App() {
  const today = useMemo(() => todayISO(), [])
  const windowStart = useMemo(() => getWindowStart(), [])

  const [cycles, setCycles] = useState(initialCycles)
  const [activeCycleId, setActiveCycleId] = useState<string | null>(
    () => initialCycles.find((c) => today >= c.startDate && today <= c.endDate)?.id ?? null
  )
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const todayIndex = daysBetween(windowStart, today)
    const scrollX = Math.max(0, (todayIndex - 3) * DAY_WIDTH)
    scrollRef.current?.scrollTo({ x: scrollX, animated: false })
  }, [])

  function handleCyclePress(id: string) {
    setActiveCycleId((prev) => (prev === id ? null : id))
  }

  function handleCreatePeriod(startDate: string) {
    const id = `cycle-${Date.now()}`
    const newCycle = {
      id,
      startDate,
      endDate: addDays(startDate, DEFAULT_DAYS - 1),
      items: [],
    }
    setCycles((prev) => [...prev, newCycle])
    setActiveCycleId(id)
  }

  function handleChangeDays(days: number) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? { ...c, endDate: addDays(c.startDate, days - 1) }
          : c
      )
    )
  }

  function handleScanComingSoon() {
    Alert.alert('Coming soon', 'Shopping is not implemented yet.')
  }

  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const extraDates = extraMeals.map((e) => e.date)
  const activeDayCount = activeCycle
    ? daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    : DEFAULT_DAYS

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          <View style={{ width: TOTAL_DAYS * DAY_WIDTH }}>
            <CalendarStrip
              windowStart={windowStart}
              totalDays={TOTAL_DAYS}
              today={today}
              extraDates={extraDates}
              dayWidth={DAY_WIDTH}
            />
            <TimelineView
              cycles={cycles}
              extraMeals={extraMeals}
              windowStart={windowStart}
              totalDays={TOTAL_DAYS}
              activeCycleId={activeCycleId}
              onCyclePress={handleCyclePress}
              onCreatePeriod={handleCreatePeriod}
              dayWidth={DAY_WIDTH}
            />
          </View>
        </ScrollView>
        {activeCycle && activeCycle.items.length > 0 && (
          <MealPrepDetail activeCycle={activeCycle} />
        )}
        {activeCycle && activeCycle.items.length === 0 && (
          <NewPeriodPanel
            dayCount={activeDayCount}
            onDaysChange={handleChangeDays}
            onScanBarcode={handleScanComingSoon}
            onScanReceipt={handleScanComingSoon}
          />
        )}
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
