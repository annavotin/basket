import React, { useRef, useEffect, useState, useMemo } from 'react'
import {
  Alert,
  View,
  ScrollView,
  Text,
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native'
import CalendarStrip from './src/components/CalendarStrip'
import TimelineView from './src/components/TimelineView'
import MealPrepDetail from './src/components/MealPrepDetail'
import NewPeriodPanel from './src/components/NewPeriodPanel'
import BudgetBar from './src/components/BudgetBar'
import AddFab from './src/components/AddFab'
import AddItemSheet from './src/components/AddItemSheet'
import ReceiptReviewSheet from './src/components/ReceiptReviewSheet'
import ExtraMealDetail from './src/components/ExtraMealDetail'
import ExtraMealSheet from './src/components/ExtraMealSheet'
import WebBarcodeScannerModal from './src/components/WebBarcodeScannerModal'
import { cycles as initialCycles, extraMeals as initialExtraMeals, DAILY_KCAL_GOAL } from './src/data'
import { todayISO, addDays, daysBetween } from './src/utils/dates'
import { totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate } from './src/utils/nutrition'
import { colors } from './src/styles/colors'
import { FoodItem, ExtraMeal, ReceiptLine } from './src/types'
import { Product } from './src/mockProducts'
import { scanBarcodeWithCamera, simulateReceiptScan } from './src/services/scan'
import { lookupProductByBarcode } from './src/services/foodApi'
import { loadCycles, saveCycles, loadExtras, saveExtras } from './src/services/storage'

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
  const [extraMeals, setExtraMeals] = useState<ExtraMeal[]>(initialExtraMeals)
  const [activeExtraDate, setActiveExtraDate] = useState<string | null>(null)
  const [extraSheetVisible, setExtraSheetVisible] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [reviewLines, setReviewLines] = useState<ReceiptLine[]>([])
  const [webScannerVisible, setWebScannerVisible] = useState(false)
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
    loadExtras().then((stored) => {
      if (!cancelled && stored) setExtraMeals(stored)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (hydrated) saveCycles(cycles)
  }, [cycles, hydrated])

  useEffect(() => {
    if (hydrated) saveExtras(extraMeals)
  }, [extraMeals, hydrated])

  function handleCyclePress(id: string) {
    setActiveExtraDate(null)
    setActiveCycleId((prev) => (prev === id ? null : id))
  }

  function handleExtraPress(date: string) {
    setActiveCycleId(null)
    setActiveExtraDate((prev) => (prev === date ? null : date))
  }

  function handleAddExtra() {
    setExtraSheetVisible(true)
  }

  function handleSaveExtra(draft: { name: string; kcal: number }) {
    if (!activeExtraDate) return
    setExtraMeals((prev) => [
      ...prev,
      { id: `extra-${Date.now()}`, date: activeExtraDate, name: draft.name, kcal: draft.kcal },
    ])
    setExtraSheetVisible(false)
  }

  function handleRemoveExtra(id: string) {
    Alert.alert('Remove extra meal', 'Remove this extra meal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setExtraMeals((prev) => prev.filter((e) => e.id !== id)) },
    ])
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
    if (Platform.OS === 'web') {
      setWebScannerVisible(true)
      return
    }
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product)
    setSheetVisible(true)
  }

  async function handleWebBarcode(barcode: string) {
    setWebScannerVisible(false)
    const product = await lookupProductByBarcode(barcode)
    setSheetProduct(product)
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

  const extraDates = extraMeals.map((e) => e.date)
  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const activeDayCount = activeCycle
    ? daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    : DEFAULT_DAYS

  let barMealPrep = 0
  let barExtra = 0
  let barBudget = DAILY_KCAL_GOAL
  if (activeExtraDate) {
    const containing = cycles.find(
      (c) => activeExtraDate >= c.startDate && activeExtraDate <= c.endDate
    )
    if (containing) {
      const days = daysBetween(containing.startDate, containing.endDate) + 1
      barMealPrep = totalKcal(containing.items)
      barExtra = extrasKcalInRange(extraMeals, containing.startDate, containing.endDate)
      barBudget = cycleBudget(days, DAILY_KCAL_GOAL)
    } else {
      barExtra = extrasKcalOnDate(extraMeals, activeExtraDate)
      barBudget = DAILY_KCAL_GOAL
    }
  } else if (activeCycle) {
    const days = daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    barMealPrep = totalKcal(activeCycle.items)
    barExtra = extrasKcalInRange(extraMeals, activeCycle.startDate, activeCycle.endDate)
    barBudget = cycleBudget(days, DAILY_KCAL_GOAL)
  }
  const extrasForActiveDate = activeExtraDate
    ? extraMeals.filter((e) => e.date === activeExtraDate)
    : []

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
              onExtraPress={handleExtraPress}
              activeExtraDate={activeExtraDate}
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
        {activeExtraDate ? (
          <View style={styles.detailArea}>
            <BudgetBar mealPrepKcal={barMealPrep} extraKcal={barExtra} budgetKcal={barBudget} />
            <ExtraMealDetail
              date={activeExtraDate}
              extras={extrasForActiveDate}
              onRemoveExtra={handleRemoveExtra}
            />
            <AddFab manualOnly onAddManual={handleAddExtra} />
          </View>
        ) : (
          <>
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
                <BudgetBar mealPrepKcal={barMealPrep} extraKcal={barExtra} budgetKcal={barBudget} />
                <MealPrepDetail activeCycle={activeCycle} onRemoveItem={handleRemoveItem} />
                <AddFab
                  onScanBarcode={handleScanBarcode}
                  onScanReceipt={handleScanReceipt}
                  onAddManual={handleAddManual}
                />
              </View>
            )}
          </>
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
        <ExtraMealSheet
          visible={extraSheetVisible}
          onSave={handleSaveExtra}
          onClose={() => setExtraSheetVisible(false)}
        />
        <WebBarcodeScannerModal
          visible={webScannerVisible}
          onScanned={handleWebBarcode}
          onClose={() => setWebScannerVisible(false)}
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
