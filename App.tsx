import React, { useRef, useEffect, useState, useMemo } from 'react'
import {
  Alert,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native'
import { useFonts } from 'expo-font'
import CalendarStrip from './src/components/CalendarStrip'
import TimelineView from './src/components/TimelineView'
import MealPrepDetail from './src/components/MealPrepDetail'
import SegmentedNav from './src/components/SegmentedNav'
import ExtrasPeriodList from './src/components/ExtrasPeriodList'
import PantryPeriodView from './src/components/PantryPeriodView'
import NewPeriodPanel from './src/components/NewPeriodPanel'
import BudgetBar from './src/components/BudgetBar'
import AddFab from './src/components/AddFab'
import AddItemSheet from './src/components/AddItemSheet'
import ReceiptReviewSheet from './src/components/ReceiptReviewSheet'
import ExtraMealDetail from './src/components/ExtraMealDetail'
import ExtraMealSheet from './src/components/ExtraMealSheet'
import ProfileScreen from './src/components/ProfileScreen'
import PantryScreen from './src/components/PantryScreen'
import WebBarcodeScannerModal from './src/components/WebBarcodeScannerModal'
import EditItemSheet from './src/components/EditItemSheet'
import { cycles as initialCycles, extraMeals as initialExtraMeals, DAILY_KCAL_GOAL, pantry as initialPantry } from './src/data'
import { todayISO, addDays, daysBetween } from './src/utils/dates'
import { totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate, pantryKcalForCycle } from './src/utils/nutrition'
import { useColors, ThemeProvider } from './src/styles/ThemeProvider'
import { fontMap } from './src/styles/fonts'
import { FoodItem, ExtraMeal, ReceiptLine, PantryItem, WeeklyTab } from './src/types'
import { Product } from './src/mockProducts'
import { scanBarcodeWithCamera, simulateReceiptScan } from './src/services/scan'
import { lookupProductByBarcode } from './src/services/foodApi'
import { loadCycles, saveCycles, loadExtras, saveExtras, loadDailyGoal, saveDailyGoal, loadPantry, savePantry } from './src/services/storage'

const DAY_WIDTH = 64
const TOTAL_DAYS = 45
const WINDOW_OFFSET = 7  // days before today the window starts
const DEFAULT_DAYS = 4

function getWindowStart(): string {
  return addDays(todayISO(), -WINDOW_OFFSET)
}

function AppInner() {
  const colors = useColors()
  const today = useMemo(() => todayISO(), [])
  const windowStart = useMemo(() => getWindowStart(), [])

  const styles = useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    greeting: {
      fontSize: 26,
      fontWeight: '700',
      paddingBottom: 8,
      color: colors.dayText,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerBtnSpacer: {
      marginRight: 12,
    },
    headerBtnText: {
      fontSize: 15,
      color: colors.monthText,
    },
    horizontalScroll: {
      flexGrow: 0,
    },
    detailArea: {
      flex: 1,
    },
    navWrap: {
      position: 'absolute',
      left: 20,
      right: 88,
      bottom: 34,
    },
    navWrapFull: {
      right: 20,
    },
  }), [colors])

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
  const [dailyGoal, setDailyGoal] = useState(DAILY_KCAL_GOAL)
  const [profileVisible, setProfileVisible] = useState(false)
  const [pantry, setPantry] = useState<PantryItem[]>(initialPantry)
  const [pantryVisible, setPantryVisible] = useState(false)
  const [weeklyTab, setWeeklyTab] = useState<WeeklyTab>('basket')
  const [pendingExtraDate, setPendingExtraDate] = useState<string | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
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
    loadDailyGoal().then((g) => {
      if (!cancelled && g) setDailyGoal(g)
    })
    loadPantry().then((p) => {
      if (!cancelled && p) setPantry(p)
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

  useEffect(() => {
    if (hydrated) saveDailyGoal(dailyGoal)
  }, [dailyGoal, hydrated])

  useEffect(() => {
    if (hydrated) savePantry(pantry)
  }, [pantry, hydrated])

  function changeSelection(nextCycleId: string | null, nextExtraDate: string | null) {
    setCycles((prev) =>
      prev.filter((c) => !(c.id === activeCycleId && c.items.length === 0 && c.id !== nextCycleId))
    )
    setActiveCycleId(nextCycleId)
    setActiveExtraDate(nextExtraDate)
    setWeeklyTab('basket')
  }

  function handleCyclePress(id: string) {
    changeSelection(activeCycleId === id ? null : id, null)
  }

  function handleExtraPress(date: string) {
    changeSelection(null, activeExtraDate === date ? null : date)
  }

  function openExtraSheet(date: string) {
    setPendingExtraDate(date)
    setExtraSheetVisible(true)
  }

  function handleAddExtra() {
    if (activeExtraDate) openExtraSheet(activeExtraDate)
  }

  function handleAddExtraForPeriod() {
    if (!activeCycle) return
    const inRange = today >= activeCycle.startDate && today <= activeCycle.endDate
    openExtraSheet(inRange ? today : activeCycle.startDate)
  }

  function handleSaveExtra(draft: { name: string; kcal: number }) {
    if (!pendingExtraDate) return
    setExtraMeals((prev) => [
      ...prev,
      { id: `extra-${Date.now()}`, date: pendingExtraDate, name: draft.name, kcal: draft.kcal },
    ])
    setExtraSheetVisible(false)
    setPendingExtraDate(null)
  }

  function handleRemoveExtra(id: string) {
    Alert.alert('Remove extra meal', 'Remove this extra meal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setExtraMeals((prev) => prev.filter((e) => e.id !== id)) },
    ])
  }

  function handleCreatePeriod(startDate: string) {
    const id = `cycle-${Date.now()}`
    const newCycle = { id, startDate, endDate: addDays(startDate, DEFAULT_DAYS - 1), items: [] }
    setCycles((prev) => [
      ...prev.filter((c) => !(c.id === activeCycleId && c.items.length === 0)),
      newCycle,
    ])
    setActiveExtraDate(null)
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

  function handleEditItem(index: number) {
    setEditIndex(index)
  }

  function handleSaveEdit(updated: FoodItem) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? { ...c, items: c.items.map((it, i) => (i === editIndex ? updated : it)) }
          : c
      )
    )
    setEditIndex(null)
  }

  function handleAddPantry(draft: { name: string; kcalPer100g: number; dailyG: number }) {
    setPantry((prev) => [...prev, { id: `pantry-${Date.now()}`, emoji: '🥫', ...draft }])
  }

  function handleSetPantryGrams(id: string, grams: number) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? { ...c, pantryOverrides: { ...(c.pantryOverrides ?? {}), [id]: grams } }
          : c
      )
    )
  }

  function handleRemovePantry(id: string) {
    Alert.alert('Remove staple', 'Remove this pantry staple?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPantry((prev) => prev.filter((p) => p.id !== id)) },
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
  let barPantry = 0
  let barExtra = 0
  let barBudget = dailyGoal
  if (activeExtraDate) {
    const containing = cycles.find(
      (c) => activeExtraDate >= c.startDate && activeExtraDate <= c.endDate
    )
    if (containing) {
      const days = daysBetween(containing.startDate, containing.endDate) + 1
      barMealPrep = totalKcal(containing.items)
      barPantry = pantryKcalForCycle(pantry, containing, days)
      barExtra = extrasKcalInRange(extraMeals, containing.startDate, containing.endDate)
      barBudget = cycleBudget(days, dailyGoal)
    } else {
      barExtra = extrasKcalOnDate(extraMeals, activeExtraDate)
      barBudget = dailyGoal
    }
  } else if (activeCycle) {
    const days = daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    barMealPrep = totalKcal(activeCycle.items)
    barPantry = pantryKcalForCycle(pantry, activeCycle, days)
    barExtra = extrasKcalInRange(extraMeals, activeCycle.startDate, activeCycle.endDate)
    barBudget = cycleBudget(days, dailyGoal)
  }
  const extrasForActiveDate = activeExtraDate
    ? extraMeals.filter((e) => e.date === activeExtraDate)
    : []
  const extrasForPeriod = activeCycle
    ? extraMeals.filter((e) => e.date >= activeCycle.startDate && e.date <= activeCycle.endDate)
    : []

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View testID="app-header" style={styles.header}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity testID="open-pantry" onPress={() => setPantryVisible(true)} style={styles.headerBtnSpacer}>
              <Text style={styles.headerBtnText}>🥫 Pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="open-profile" onPress={() => setProfileVisible(true)}>
              <Text style={styles.headerBtnText}>⚙ Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
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
            <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} />
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
                <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} />
                {weeklyTab === 'basket' && (
                  <MealPrepDetail
                    activeCycle={activeCycle}
                    onRemoveItem={handleRemoveItem}
                    onEditItem={handleEditItem}
                  />
                )}
                {weeklyTab === 'extras' && (
                  <ExtrasPeriodList extras={extrasForPeriod} onRemoveExtra={handleRemoveExtra} />
                )}
                {weeklyTab === 'pantry' && (
                  <PantryPeriodView
                    cycle={activeCycle}
                    pantry={pantry}
                    cycleDays={activeDayCount}
                    onSetPantryGrams={handleSetPantryGrams}
                  />
                )}
                <View style={[styles.navWrap, weeklyTab === 'pantry' && styles.navWrapFull]}>
                  <SegmentedNav active={weeklyTab} onChange={setWeeklyTab} />
                </View>
                {weeklyTab !== 'pantry' && (
                  <AddFab
                    manualOnly={weeklyTab === 'extras'}
                    onScanBarcode={handleScanBarcode}
                    onScanReceipt={handleScanReceipt}
                    onAddManual={weeklyTab === 'extras' ? handleAddExtraForPeriod : handleAddManual}
                  />
                )}
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
          onClose={() => { setExtraSheetVisible(false); setPendingExtraDate(null) }}
        />
        <WebBarcodeScannerModal
          visible={webScannerVisible}
          onScanned={handleWebBarcode}
          onClose={() => setWebScannerVisible(false)}
        />
        <EditItemSheet
          visible={editIndex !== null}
          item={editIndex !== null ? activeCycle?.items[editIndex] ?? null : null}
          onSave={handleSaveEdit}
          onClose={() => setEditIndex(null)}
        />
        <ProfileScreen
          visible={profileVisible}
          dailyGoal={dailyGoal}
          onSave={(g) => { setDailyGoal(g); setProfileVisible(false) }}
          onClose={() => setProfileVisible(false)}
        />
        <PantryScreen
          visible={pantryVisible}
          pantry={pantry}
          onAdd={handleAddPantry}
          onRemove={handleRemovePantry}
          onClose={() => setPantryVisible(false)}
        />
      </View>
    </SafeAreaView>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts(fontMap)
  if (!fontsLoaded) return null
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
