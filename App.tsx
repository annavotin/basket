import React, { useRef, useEffect, useState, useMemo } from 'react'
import { newId } from './src/utils/ids'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('./app.json')
const APP_VERSION: string = (appJson as { expo?: { version?: string } }).expo?.version ?? '1.0.0'
import {
  Alert,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Share,
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
import SettingsScreen from './src/components/SettingsScreen'
import PantryScreen from './src/components/PantryScreen'
import ItemDetail from './src/components/ItemDetail'
import BasketPage from './src/components/BasketPage'
import CarryOverSheet from './src/components/CarryOverSheet'
import { cycles as initialCycles, extraMeals as initialExtraMeals, DAILY_KCAL_GOAL, pantry as initialPantry, DEFAULT_PREFERENCES } from './src/data'
import { todayISO, addDays, daysBetween, formatDay } from './src/utils/dates'
import { totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate, pantryKcalForCycle } from './src/utils/nutrition'
import { useColors, ThemeProvider } from './src/styles/ThemeProvider'
import { UnitsProvider } from './src/styles/UnitsProvider'
import { fonts, fontMap } from './src/styles/fonts'
import { FoodItem, ExtraMeal, ReceiptLine, PantryItem, WeeklyTab, Preferences, MealPrepCycle } from './src/types'
import { Product } from './src/mockProducts'
import { scanBarcodeWithCamera, simulateReceiptScan } from './src/services/scan'
import { lookupProductByBarcode } from './src/services/foodApi'
import { loadCycles, saveCycles, loadExtras, saveExtras, loadDailyGoal, saveDailyGoal, loadPantry, savePantry, loadPrefs, savePrefs, exportAll, clearAll } from './src/services/storage'
import { auth as authService, Account } from './src/services/auth'

const DAY_WIDTH = 64
const TOTAL_DAYS = 45
const WINDOW_OFFSET = 7  // days before today the window starts

function getWindowStart(): string {
  return addDays(todayISO(), -WINDOW_OFFSET)
}

function AppInner({ prefs, setPrefs }: { prefs: Preferences; setPrefs: React.Dispatch<React.SetStateAction<Preferences>> }) {
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
      fontFamily: fonts.head,
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
  const [hydrated, setHydrated] = useState(false)
  const [dailyGoal, setDailyGoal] = useState(DAILY_KCAL_GOAL)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [pantry, setPantry] = useState<PantryItem[]>(initialPantry)
  const [pantryVisible, setPantryVisible] = useState(false)
  const [weeklyTab, setWeeklyTab] = useState<WeeklyTab>('basket')
  const [pendingExtraDate, setPendingExtraDate] = useState<string | null>(null)
  const [detailTarget, setDetailTarget] = useState<
    { kind: 'item'; index: number } | { kind: 'extra'; id: string } | { kind: 'pantry'; id: string } | null
  >(null)
  const [basketPageOpen, setBasketPageOpen] = useState(false)
  const [carryOver, setCarryOver] = useState<{ newCycleId: string; prevCycle: MealPrepCycle } | null>(null)
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
      { id: newId(), date: pendingExtraDate, name: draft.name, kcal: draft.kcal },
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
    const id = newId()
    const newCycle = { id, startDate, endDate: addDays(startDate, prefs.defaultDays - 1), items: [] }
    const prevCycle = cycles
      .filter((c) => c.items.length > 0 && c.id !== activeCycleId)
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]
    setCycles((prev) => [
      ...prev.filter((c) => !(c.id === activeCycleId && c.items.length === 0)),
      newCycle,
    ])
    setActiveExtraDate(null)
    setActiveCycleId(id)
    if (prevCycle) setCarryOver({ newCycleId: id, prevCycle })
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

  function handleDeleteCycle() {
    Alert.alert('Delete this basket?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setCycles((prev) => prev.filter((c) => c.id !== activeCycleId))
          setActiveCycleId(null)
          setBasketPageOpen(false)
        },
      },
    ])
  }

  async function handleScanBarcode() {
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return
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

  function handleEditItem(index: number) {
    setDetailTarget({ kind: 'item', index })
  }

  function handleSaveItemPatch(index: number, patch: Partial<FoodItem>) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? { ...c, items: c.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }
          : c
      )
    )
  }

  function handleSaveExtraPatch(id: string, patch: { name: string; kcal: number }) {
    setExtraMeals((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function handleSavePantryPatch(id: string, patch: { kcalPer100g: number; dailyG: number }) {
    setPantry((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function handleDetailRemove(target: NonNullable<typeof detailTarget>) {
    if (target.kind === 'item') {
      setCycles((prev) =>
        prev.map((c) =>
          c.id === activeCycleId ? { ...c, items: c.items.filter((_, i) => i !== target.index) } : c
        )
      )
    } else if (target.kind === 'extra') {
      setExtraMeals((prev) => prev.filter((e) => e.id !== target.id))
    } else {
      setPantry((prev) => prev.filter((p) => p.id !== target.id))
    }
    setDetailTarget(null)
  }

  function handleAddPantry(draft: { name: string; kcalPer100g: number; dailyG: number }) {
    setPantry((prev) => [...prev, { id: newId(), emoji: '🥫', ...draft }])
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

  function handleSetDefaultGrams(id: string, dailyG: number) {
    setPantry((prev) => prev.map((p) => p.id === id ? { ...p, dailyG } : p))
  }

  function handleResetPantryOverride(id: string) {
    setCycles((prev) =>
      prev.map((c) => {
        if (c.id !== activeCycleId) return c
        const { [id]: _, ...rest } = c.pantryOverrides ?? {}
        return { ...c, pantryOverrides: rest }
      })
    )
  }

  function handleConfirmReceipt(items: FoodItem[]) {
    handleAddItems(items)
    setReviewVisible(false)
  }

  function handleAddManual() {
    setSheetProduct(null)
    setSheetVisible(true)
  }

  async function handleExport() {
    const json = await exportAll()
    try {
      await Share.share({ message: json })
    } catch {}
  }

  function handleClearAll() {
    setCycles([])
    setActiveCycleId(null)
    setExtraMeals([])
    setPantry([])
    setDailyGoal(DAILY_KCAL_GOAL)
    setPrefs(DEFAULT_PREFERENCES)
    clearAll()
    setSettingsVisible(false)
  }

  const extraDates = extraMeals.map((e) => e.date)
  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null
  const activeDayCount = activeCycle
    ? daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    : prefs.defaultDays

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
          <Text style={styles.greeting}>{prefs.name ? `Hi, ${prefs.name}` : 'Hi there'}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity testID="open-pantry" onPress={() => setPantryVisible(true)} style={styles.headerBtnSpacer}>
              <Text style={styles.headerBtnText}>🥫 Pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="open-settings" onPress={() => setSettingsVisible(true)}>
              <Text style={styles.headerBtnText}>⚙ Settings</Text>
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
                  <>
                    <TouchableOpacity
                      testID="open-basket-page"
                      onPress={() => setBasketPageOpen(true)}
                      style={{ alignSelf: 'flex-end', backgroundColor: colors.forest, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 6, marginBottom: 8 }}
                    >
                      <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>Open basket ›</Text>
                    </TouchableOpacity>
                    <MealPrepDetail
                      activeCycle={activeCycle}
                      onEditItem={handleEditItem}
                    />
                  </>
                )}
                {weeklyTab === 'extras' && (
                  <ExtrasPeriodList
                    extras={extrasForPeriod}
                    onOpenExtra={(id) => setDetailTarget({ kind: 'extra', id })}
                  />
                )}
                {weeklyTab === 'pantry' && (
                  <PantryPeriodView
                    cycle={activeCycle}
                    pantry={pantry}
                    cycleDays={activeDayCount}
                    onSetPantryGrams={handleSetPantryGrams}
                    onOpenPantry={(id) => setDetailTarget({ kind: 'pantry', id })}
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
          onScanBarcode={() => { setSheetVisible(false); handleScanBarcode() }}
          onScanReceipt={() => { setSheetVisible(false); handleScanReceipt() }}
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
        <SettingsScreen
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          prefs={prefs}
          setPrefs={setPrefs}
          dailyGoal={dailyGoal}
          onDailyGoal={setDailyGoal}
          onExport={handleExport}
          onClearAll={handleClearAll}
          account={account}
          onAuthed={(a) => setAccount(a)}
          onSignOut={() => { authService.signOut(); setAccount(null) }}
          onDeleteAccount={() => { authService.deleteAccount(); setAccount(null); setSettingsVisible(false) }}
          authService={authService}
          sync={account ? 'synced' : 'offline'}
          version={APP_VERSION}
        />
        <PantryScreen
          visible={pantryVisible}
          pantry={pantry}
          onAdd={handleAddPantry}
          onRemove={handleRemovePantry}
          onClose={() => setPantryVisible(false)}
          cycle={activeCycle}
          cycleDays={activeDayCount}
          onSetDefaultGrams={handleSetDefaultGrams}
          onSetPantryGrams={handleSetPantryGrams}
          onResetPantryOverride={handleResetPantryOverride}
        />
        {detailTarget && (
          <ItemDetail
            visible
            kind={detailTarget.kind}
            item={detailTarget.kind === 'item' ? activeCycle?.items[detailTarget.index] : undefined}
            extra={detailTarget.kind === 'extra' ? extraMeals.find((e) => e.id === detailTarget.id) : undefined}
            pantryItem={detailTarget.kind === 'pantry' ? pantry.find((p) => p.id === detailTarget.id) : undefined}
            days={activeDayCount}
            dateLabel={
              detailTarget.kind === 'extra'
                ? (() => {
                    const e = extraMeals.find((x) => x.id === detailTarget.id)
                    if (!e) return undefined
                    const d = formatDay(e.date)
                    return `${d.day} ${d.month}`
                  })()
                : undefined
            }
            onSaveItem={(patch) => { if (detailTarget.kind === 'item') handleSaveItemPatch(detailTarget.index, patch) }}
            onSaveExtra={(patch) => { if (detailTarget.kind === 'extra') handleSaveExtraPatch(detailTarget.id, patch) }}
            onSavePantry={(patch) => { if (detailTarget.kind === 'pantry') handleSavePantryPatch(detailTarget.id, patch) }}
            onRemove={() => handleDetailRemove(detailTarget)}
            onClose={() => setDetailTarget(null)}
          />
        )}
        {carryOver && (
          <CarryOverSheet
            visible
            prevCycle={carryOver.prevCycle}
            onConfirm={(carried) => {
              if (carried.length) {
                setCycles((prev) => prev.map((c) => (c.id === carryOver.newCycleId ? { ...c, items: [...c.items, ...carried] } : c)))
              }
              setCarryOver(null)
            }}
            onSkip={() => setCarryOver(null)}
            onClose={() => setCarryOver(null)}
          />
        )}
        {activeCycle && (
          <BasketPage
            visible={basketPageOpen}
            cycle={activeCycle}
            pantry={pantry}
            extras={extraMeals}
            dailyGoal={dailyGoal}
            macroTargets={prefs.macroTargets}
            onBack={() => setBasketPageOpen(false)}
            onAddItem={() => { setBasketPageOpen(false); handleAddManual() }}
            onScanReceipt={() => { setBasketPageOpen(false); handleScanReceipt() }}
            onSetDays={handleChangeDays}
            onDeleteCycle={handleDeleteCycle}
            onItemPress={(index) => setDetailTarget({ kind: 'item', index })}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts(fontMap)
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [prefsHydrated, setPrefsHydrated] = useState(false)
  useEffect(() => { loadPrefs().then((p) => { setPrefs(p); setPrefsHydrated(true) }) }, [])
  useEffect(() => { if (prefsHydrated) savePrefs(prefs) }, [prefs, prefsHydrated])
  if (!fontsLoaded) return null
  return (
    <ThemeProvider theme={prefs.theme} accent={prefs.accent}>
      <UnitsProvider units={prefs.units}>
        <AppInner prefs={prefs} setPrefs={setPrefs} />
      </UnitsProvider>
    </ThemeProvider>
  )
}
