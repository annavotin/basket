import React, { useRef, useEffect, useState, useMemo } from 'react'
import {
  Alert,
  View,
  ScrollView,
  Text,
  SafeAreaView,
  StyleSheet,
} from 'react-native'
import CalendarStrip from './src/components/CalendarStrip'
import TimelineView from './src/components/TimelineView'
import MealPrepDetail from './src/components/MealPrepDetail'
import NewPeriodPanel from './src/components/NewPeriodPanel'
import BudgetBar from './src/components/BudgetBar'
import AddFab from './src/components/AddFab'
import AddItemSheet from './src/components/AddItemSheet'
import ReceiptReviewSheet from './src/components/ReceiptReviewSheet'
import { cycles as initialCycles, extraMeals, DAILY_KCAL_GOAL } from './src/data'
import { todayISO, addDays, daysBetween } from './src/utils/dates'
import { totalKcal, cycleBudget } from './src/utils/nutrition'
import { colors } from './src/styles/colors'
import { FoodItem, ReceiptLine } from './src/types'
import { Product } from './src/mockProducts'
import { scanBarcodeWithCamera, simulateReceiptScan } from './src/services/scan'
import { lookupProductByBarcode } from './src/services/foodApi'
import { loadCycles, saveCycles } from './src/services/storage'

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
  const [sheetVisible, setSheetVisible] = useState(false)
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [reviewLines, setReviewLines] = useState<ReceiptLine[]>([])
  const [hydrated, setHydrated] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const todayIndex = daysBetween(windowStart, today)
    const scrollX = Math.max(0, (todayIndex - 3) * DAY_WIDTH)
    scrollRef.current?.scrollTo({ x: scrollX, animated: false })
  }, [])

  useEffect(() => {
    let cancelled = false
    loadCycles().then((stored) => {
      if (cancelled) return
      if (stored) {
        setCycles(stored)
        const restoredActive =
          stored.find((c) => today >= c.startDate && today <= c.endDate)?.id ?? null
        setActiveCycleId(restoredActive)
      }
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (hydrated) saveCycles(cycles)
  }, [cycles, hydrated])

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

  async function handleScanBarcode() {
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return // cancelled, denied, or scanner unavailable
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product) // null -> AddItemSheet opens in manual mode
    setSheetVisible(true)
  }

  async function handleScanReceipt() {
    const lines = await simulateReceiptScan()
    if (lines) {
      setReviewLines(lines)
      setReviewVisible(true)
    }
  }

  function handleAddItems(items: FoodItem[]) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId ? { ...c, items: [...c.items, ...items] } : c
      )
    )
  }

  function handleAddItem(item: FoodItem) {
    handleAddItems([item])
  }

  function handleRemoveItem(index: number) {
    Alert.alert('Remove item', 'Remove this item from the period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setCycles((prev) =>
            prev.map((c) =>
              c.id === activeCycleId
                ? { ...c, items: c.items.filter((_, i) => i !== index) }
                : c
            )
          ),
      },
    ])
  }

  function handleConfirmReceipt(items: FoodItem[]) {
    handleAddItems(items)
    setReviewVisible(false)
  }

  function handleAddManual() {
    setSheetProduct(null)
    setSheetVisible(true)
  }

  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const extraDates = extraMeals.map((e) => e.date)
  const activeDayCount = activeCycle
    ? daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    : DEFAULT_DAYS

  const stockedKcal = activeCycle ? totalKcal(activeCycle.items) : 0
  const budgetKcal = cycleBudget(activeDayCount, DAILY_KCAL_GOAL)

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
        {activeCycle && activeCycle.items.length === 0 && (
          <NewPeriodPanel
            dayCount={activeDayCount}
            onDaysChange={handleChangeDays}
            onScanBarcode={handleScanBarcode}
            onScanReceipt={handleScanReceipt}
            onAddManual={handleAddManual}
          />
        )}
        {activeCycle && activeCycle.items.length > 0 && (
          <View style={styles.detailArea}>
            <BudgetBar mealPrepKcal={stockedKcal} extraKcal={0} budgetKcal={budgetKcal} />
            <MealPrepDetail activeCycle={activeCycle} onRemoveItem={handleRemoveItem} />
            <AddFab onScanBarcode={handleScanBarcode} onScanReceipt={handleScanReceipt} onAddManual={handleAddManual} />
          </View>
        )}
        <AddItemSheet
          visible={sheetVisible}
          product={sheetProduct}
          onAdd={handleAddItem}
          onClose={() => setSheetVisible(false)}
        />
        <ReceiptReviewSheet
          visible={reviewVisible}
          lines={reviewLines}
          onConfirm={handleConfirmReceipt}
          onClose={() => setReviewVisible(false)}
        />
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
  detailArea: {
    flex: 1,
  },
})
