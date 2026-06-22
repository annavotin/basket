import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { newId } from './src/utils/ids'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('./app.json')
const APP_VERSION: string = (appJson as { expo?: { version?: string } }).expo?.version ?? '1.0.0'
import {
  Alert,
  AppState,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Share,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
import DragHandleCard from './src/components/DragHandleCard'
import BasketCharts from './src/components/BasketCharts'
import CarryOverSheet from './src/components/CarryOverSheet'
import { cycles as initialCycles, extraMeals as initialExtraMeals, DAILY_KCAL_GOAL, pantry as initialPantry, DEFAULT_PREFERENCES } from './src/data'
import { todayISO, addDays, daysBetween, formatDay, formatLong } from './src/utils/dates'
import { totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate, pantryKcalForCycle, aggregateMacros } from './src/utils/nutrition'
import { useColors, ThemeProvider } from './src/styles/ThemeProvider'
import { UnitsProvider } from './src/styles/UnitsProvider'
import { fonts, fontMap } from './src/styles/fonts'
import { FoodItem, ExtraMeal, ReceiptLine, PantryItem, WeeklyTab, Preferences, MealPrepCycle, Macros, CustomFood } from './src/types'
import { Product } from './src/mockProducts'
import { scanBarcodeWithCamera, scanReceipt } from './src/services/scan'
import { lookupBarcode } from './src/services/foodApi'
import { loadCycles, saveCycles, loadExtras, saveExtras, loadDailyGoal, saveDailyGoal, loadPantry, savePantry, loadPrefs, savePrefs, exportAll, clearAll, loadCustomFoods, saveCustomFoods, loadKeepScanning, saveKeepScanning } from './src/services/storage'
import { customFoodFromItem, upsertCustomFood, findCustomByBarcode, customFoodToProduct } from './src/services/customFoods'
import CustomFoodsScreen from './src/components/CustomFoodsScreen'
import { auth as authService, Account } from './src/services/auth'
import { supabase, isSupabaseConfigured } from './src/services/supabase'
import { createSupabaseRemote } from './src/services/supabase-remote'
import { SyncTable, SyncRecord } from './src/services/remote'
import { createSyncEngine, SyncEngine } from './src/services/sync-engine'
import { makeQueue } from './src/services/sync-queue'
import { clearSyncMetadata, ADOPTED_KEY } from './src/services/sync-reset'
import { touch, isLive } from './src/utils/sync-meta'

const DAY_WIDTH = 64
const TOTAL_DAYS = 45
const WINDOW_OFFSET = 7  // days before today the window starts

// Dirty queue is persistent and remote-independent: edits made offline (or signed out)
// are recorded here and pushed on the next sync once a backend is active.
const syncQueue = makeQueue(AsyncStorage)
const SYNC_DEBOUNCE_MS = 1500

function getWindowStart(): string {
  return addDays(todayISO(), -WINDOW_OFFSET)
}

function AppInner({ prefs, setPrefs }: { prefs: Preferences; setPrefs: React.Dispatch<React.SetStateAction<Preferences>> }) {
  const colors = useColors()
  const today = useMemo(() => todayISO(), [])
  const windowStart = useMemo(() => getWindowStart(), [])

  const styles = useMemo(() => StyleSheet.create({
    // Three visually distinct horizontal bands, getting greener top -> bottom:
    // header (lightest) over the calendar zone (mid) over the detail panel (deepest).
    safe: {
      flex: 1,
      backgroundColor: colors.sageBg2,
    },
    container: {
      flex: 1,
      backgroundColor: colors.sageBg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      backgroundColor: colors.sageBg2,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    greeting: {
      fontSize: 26,
      fontFamily: fonts.head,
      fontWeight: '700',
      color: colors.dayText,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.monthText,
      marginTop: 2,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerBtnSpacer: {
      marginRight: 9,
    },
    headerBtnText: {
      fontSize: 15,
      color: colors.monthText,
    },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#2C3A1E',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    iconBtnText: {
      fontSize: 18,
    },
    horizontalScroll: {
      flexGrow: 0,
    },
    // Cards (cream budget card + green basket sheet) float on the page background — no panel.
    detailArea: {
      flex: 1,
      paddingTop: 4,
    },
    grab: {
      width: 38,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.line,
      alignSelf: 'center',
      marginBottom: 10,
    },
    // New-shop (empty cycle) sits on the page background — cards float on green, no panel.
    newShopArea: {
      flex: 1,
    },
    // In-tree overlay (not a native Modal): showing it via <Modal> meant it had to
    // *dismiss* in the same frame the AddItemSheet/ReceiptReviewSheet Modal *presented*,
    // and iOS rejects presenting a modal while another is mid-transition ("Attempt to
    // present … while a presentation is in progress"), leaving the sheet stuck. As a
    // plain absolutely-positioned view it has no presentation lifecycle to collide.
    loadingScrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      elevation: 100,
      backgroundColor: 'rgba(28,36,23,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingCard: {
      backgroundColor: colors.white,
      borderRadius: 22,
      paddingVertical: 28,
      paddingHorizontal: 40,
      alignItems: 'center',
      gap: 14,
    },
    loadingText: {
      fontFamily: fonts.head,
      fontSize: 15,
      color: colors.forest,
    },
    basketSheet: {
      flex: 1,
      marginTop: 10,
      // Bleed the green fill through the SafeAreaView bottom inset so the sheet reaches the
      // physical screen edge; the matching paddingBottom keeps inner content above the inset.
      marginBottom: -48,
      paddingBottom: 48,
    },
    basketSheetTitle: {
      fontFamily: fonts.head,
      fontWeight: '700',
      fontSize: 13,
      color: '#fff',
      textAlign: 'center',
      marginBottom: 12,
    },
    expandedHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    expandedTitle: {
      fontFamily: fonts.head,
      fontWeight: '700',
      fontSize: 18,
      color: '#fff',
    },
    doneBtn: {
      backgroundColor: '#fff',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    doneTxt: {
      fontFamily: fonts.display,
      fontSize: 14,
      color: colors.forest,
    },
    navWrap: {
      position: 'absolute',
      left: 20,
      right: 88,
      bottom: 6,
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
  const [receiptScanning, setReceiptScanning] = useState(false)
  const [barcodeLooking, setBarcodeLooking] = useState(false)
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [myFoodsVisible, setMyFoodsVisible] = useState(false)
  // Barcode of the product currently in the Add sheet (so it's stored when the item is added).
  const [scanBarcode, setScanBarcode] = useState<string | null>(null)
  const [keepScanning, setKeepScanning] = useState(false)
  const [saveForLater, setSaveForLater] = useState(true)
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

  // In-place "full basket" expansion: collapse the calendar + budget bars and let the basket
  // sheet (same MealPrepDetail list) grow to fill the screen. Heights are measured once via
  // onLayout so they can be animated to 0.
  const [basketExpanded, setBasketExpanded] = useState(false)
  const [headerH, setHeaderH] = useState(0)
  const [calH, setCalH] = useState(0)
  const [budgetH, setBudgetH] = useState(0)
  const expandAnim = useRef(new Animated.Value(0)).current
  function toggleBasketExpanded(next: boolean) {
    setBasketExpanded(next)
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      // Longer, decelerating glide on the way up; a slightly snappier ease-in on the way down.
      duration: next ? 420 : 320,
      easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }
  const collapseStyle = (h: number) =>
    h
      ? {
          height: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [h, 0] }),
          opacity: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          overflow: 'hidden' as const,
        }
      : undefined

  // Live (non-tombstone) views drive the UI; the raw arrays keep tombstones so deletes
  // still propagate through sync and survive a relaunch.
  const liveCycles = useMemo(() => cycles.filter(isLive), [cycles])
  const liveExtraMeals = useMemo(() => extraMeals.filter(isLive), [extraMeals])
  const livePantry = useMemo(() => pantry.filter(isLive), [pantry])

  // --- Cloud sync ---
  const engineRef = useRef<SyncEngine | null>(null)
  const cyclesRef = useRef(cycles)
  const extraMealsRef = useRef(extraMeals)
  const pantryRef = useRef(pantry)
  cyclesRef.current = cycles
  extraMealsRef.current = extraMeals
  pantryRef.current = pantry

  /** Record a locally-changed row so it pushes on the next sync (persists even offline). */
  function markDirty(table: SyncTable, id: string) {
    void syncQueue.markDirty(table, id)
  }

  /** One sync pass per table: push dirty rows, pull remote changes, merge. Only updates
   *  state when something actually changed, so it can't loop with the debounced trigger. */
  const runSync = useCallback(async () => {
    const eng = engineRef.current
    if (!eng) {
      console.log('[sync] skipped — no engine (not signed in or Supabase not configured)')
      return
    }
    console.log('[sync] running…', {
      cycles: cyclesRef.current.length,
      extraMeals: extraMealsRef.current.length,
      pantry: pantryRef.current.length,
    })
    const pass = async <T,>(table: SyncTable, local: T[]): Promise<T[]> =>
      (await eng.pushPull(table, local as unknown as SyncRecord[])) as unknown as T[]
    const [c, e, p] = await Promise.all([
      pass<MealPrepCycle>('cycles', cyclesRef.current),
      pass<ExtraMeal>('extra_meals', extraMealsRef.current),
      pass<PantryItem>('pantry_items', pantryRef.current),
    ])
    console.log('[sync] done', { cycles: c.length, extraMeals: e.length, pantry: p.length })
    if (JSON.stringify(c) !== JSON.stringify(cyclesRef.current)) setCycles(c)
    if (JSON.stringify(e) !== JSON.stringify(extraMealsRef.current)) setExtraMeals(e)
    if (JSON.stringify(p) !== JSON.stringify(pantryRef.current)) setPantry(p)
  }, [])

  // Build/tear down the backend on sign-in/out. On the very first sign-in on this device,
  // adopt existing local data by marking every row dirty so it gets pushed up.
  useEffect(() => {
    let cancelled = false
    if (account && isSupabaseConfigured && supabase) {
      console.log('[sync] engine active for', account.email)
      const eng = createSyncEngine(createSupabaseRemote(supabase), AsyncStorage)
      engineRef.current = eng
      ;(async () => {
        const adopted = await AsyncStorage.getItem(ADOPTED_KEY)
        if (!adopted) {
          console.log('[sync] first sign-in — adopting local data', {
            cycles: cyclesRef.current.length,
            extraMeals: extraMealsRef.current.length,
            pantry: pantryRef.current.length,
          })
          await eng.markAllDirty('cycles', cyclesRef.current.map((c) => c.id))
          await eng.markAllDirty('extra_meals', extraMealsRef.current.map((m) => m.id))
          await eng.markAllDirty('pantry_items', pantryRef.current.map((m) => m.id))
          await AsyncStorage.setItem(ADOPTED_KEY, '1')
        }
        if (!cancelled) await runSync()
      })()
    } else {
      console.log('[sync] engine inactive', {
        account: !!account,
        configured: isSupabaseConfigured,
      })
      engineRef.current = null
    }
    return () => {
      cancelled = true
    }
  }, [account, runSync])

  // Sync when the app returns to the foreground (also covers reconnect after offline).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void runSync()
    })
    return () => sub.remove()
  }, [runSync])

  // Debounced sync after local edits settle.
  useEffect(() => {
    if (!hydrated || !engineRef.current) return
    const t = setTimeout(() => void runSync(), SYNC_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [cycles, extraMeals, pantry, hydrated, runSync])

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
    loadCustomFoods().then((cf) => {
      if (!cancelled && cf) setCustomFoods(cf)
    })
    loadKeepScanning().then((v) => {
      if (!cancelled) setKeepScanning(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // On launch, once cycles are available (from local storage or the first cloud pull),
  // auto-select the meal prep that covers today. Runs once, so it never overrides a
  // manual deselect made later in the session.
  const autoSelectedRef = useRef(false)
  useEffect(() => {
    if (autoSelectedRef.current || !hydrated || liveCycles.length === 0) return
    autoSelectedRef.current = true
    if (activeExtraDate) return
    const todays = liveCycles.find((c) => today >= c.startDate && today <= c.endDate)
    if (todays) setActiveCycleId(todays.id)
  }, [hydrated, liveCycles, activeExtraDate, today])

  useEffect(() => {
    let cancelled = false
    authService.getCurrentAccount().then((a) => {
      if (!cancelled && a) setAccount(a)
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
    if (hydrated) saveKeepScanning(keepScanning)
  }, [keepScanning, hydrated])

  useEffect(() => {
    if (hydrated) savePantry(pantry)
  }, [pantry, hydrated])

  useEffect(() => {
    if (hydrated) saveCustomFoods(customFoods)
  }, [customFoods, hydrated])

  // Stamp a row deleted: hidden by isLive in the UI, but kept and synced so the deletion
  // propagates to other devices instead of silently vanishing.
  function tombstone<T extends { deletedAt?: string | null }>(r: T): T {
    return touch({ ...r, deletedAt: new Date().toISOString() })
  }

  function changeSelection(nextCycleId: string | null, nextExtraDate: string | null) {
    // GC an abandoned empty draft cycle when switching away.
    const stale = cycles.find(
      (c) => c.id === activeCycleId && c.id !== nextCycleId && c.items.length === 0 && isLive(c)
    )
    if (stale) {
      setCycles((prev) => prev.map((c) => (c.id === stale.id ? tombstone(c) : c)))
      markDirty('cycles', stale.id)
    }
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
    const id = newId()
    setExtraMeals((prev) => [
      ...prev,
      touch({ id, date: pendingExtraDate, name: draft.name, kcal: draft.kcal }),
    ])
    markDirty('extra_meals', id)
    setExtraSheetVisible(false)
    setPendingExtraDate(null)
  }

  function handleRemoveExtra(id: string) {
    Alert.alert('Remove extra meal', 'Remove this extra meal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setExtraMeals((prev) => prev.map((e) => (e.id === id ? tombstone(e) : e)))
          markDirty('extra_meals', id)
        },
      },
    ])
  }

  function handleCreatePeriod(startDate: string) {
    const id = newId()
    const newCycle = touch({ id, startDate, endDate: addDays(startDate, prefs.defaultDays - 1), items: [] })
    const prevCycle = liveCycles
      .filter((c) => c.items.length > 0 && c.id !== activeCycleId)
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]
    const stale = cycles.find((c) => c.id === activeCycleId && c.items.length === 0 && isLive(c))
    setCycles((prev) => [
      ...prev.map((c) => (stale && c.id === stale.id ? tombstone(c) : c)),
      newCycle,
    ])
    if (stale) markDirty('cycles', stale.id)
    markDirty('cycles', id)
    setActiveExtraDate(null)
    setActiveCycleId(id)
    if (prevCycle) setCarryOver({ newCycleId: id, prevCycle })
  }

  function handleChangeDays(days: number) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? touch({ ...c, endDate: addDays(c.startDate, days - 1) })
          : c
      )
    )
    if (activeCycleId) markDirty('cycles', activeCycleId)
  }

  function handleDeleteCycle() {
    Alert.alert('Delete this basket?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          if (activeCycleId) {
            const deletedId = activeCycleId
            setCycles((prev) => prev.map((c) => (c.id === deletedId ? tombstone(c) : c)))
            markDirty('cycles', deletedId)
          }
          setActiveCycleId(null)
          setBasketPageOpen(false)
        },
      },
    ])
  }

  async function handleScanBarcode() {
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return
    setScanBarcode(barcode)
    setSaveForLater(true)
    // Check the user's own saved foods first — instant, and covers store-brand / produce
    // items the public databases never had.
    const saved = findCustomByBarcode(customFoods, barcode)
    let product: Product | null = saved ? customFoodToProduct(saved) : null
    if (!product) {
      setBarcodeLooking(true)
      try {
        product = await lookupBarcode(barcode)
      } finally {
        setBarcodeLooking(false)
      }
    }
    console.log(`[barcode] scanned ${barcode} — ${saved ? 'saved' : product ? 'found' : 'not found'}`)
    if (!product) {
      Alert.alert(
        'Product not found',
        `No match for barcode ${barcode}.\n\nCheck this is the code on the pack — scanners sometimes grab a nearby barcode. If your connection is patchy, try again. Otherwise add it manually below and it'll be saved so the next scan finds it instantly.`,
      )
    }
    setSheetProduct(product)
    setSheetVisible(true)
  }

  async function handleScanReceipt() {
    const lines = await scanReceipt(() => setReceiptScanning(true))
    setReceiptScanning(false)
    if (lines && lines.length > 0) {
      setReviewLines(lines)
      setReviewVisible(true)
    } else if (lines) {
      // Reached Claude but nothing usable came back.
      Alert.alert("Couldn't read that receipt", 'Try a clearer photo, or add items manually.')
    }
  }

  function handleAddItems(items: FoodItem[]) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId ? touch({ ...c, items: [...c.items, ...items] }) : c
      )
    )
    if (activeCycleId) markDirty('cycles', activeCycleId)
  }

  function handleAddItem(item: FoodItem) {
    const wasScanned = scanBarcode != null
    handleAddItems([item])
    // Manual adds always save (today's behavior); scanned adds respect the "Remember" toggle.
    if (!wasScanned || saveForLater) {
      const food = customFoodFromItem(item, scanBarcode ?? undefined)
      if (food) setCustomFoods((prev) => upsertCustomFood(prev, food))
    }
    setScanBarcode(null)
    // Keep-scanning: the sheet closes right after this; wait for the modal to finish
    // dismissing before relaunching the native scanner, or iOS rejects the present
    // ("presentation in progress") — same teardown discipline as scan.ts.
    if (wasScanned && keepScanning) {
      setTimeout(() => { handleScanBarcode() }, 450)
    }
  }

  function handleEditItem(index: number) {
    setDetailTarget({ kind: 'item', index })
  }

  function handleSaveItemPatch(index: number, patch: Partial<FoodItem>) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? touch({ ...c, items: c.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) })
          : c
      )
    )
    if (activeCycleId) markDirty('cycles', activeCycleId)
  }

  function handleSaveExtraPatch(id: string, patch: { name: string; kcal: number; macros?: Macros }) {
    setExtraMeals((prev) => prev.map((e) => (e.id === id ? touch({ ...e, ...patch }) : e)))
    markDirty('extra_meals', id)
  }

  function handleSavePantryPatch(id: string, patch: { kcalPer100g: number; dailyG: number }) {
    setPantry((prev) => prev.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)))
    markDirty('pantry_items', id)
  }

  function handleDetailRemove(target: NonNullable<typeof detailTarget>) {
    if (target.kind === 'item') {
      setCycles((prev) =>
        prev.map((c) =>
          c.id === activeCycleId ? touch({ ...c, items: c.items.filter((_, i) => i !== target.index) }) : c
        )
      )
      if (activeCycleId) markDirty('cycles', activeCycleId)
    } else if (target.kind === 'extra') {
      setExtraMeals((prev) => prev.map((e) => (e.id === target.id ? tombstone(e) : e)))
      markDirty('extra_meals', target.id)
    } else {
      setPantry((prev) => prev.map((p) => (p.id === target.id ? tombstone(p) : p)))
      markDirty('pantry_items', target.id)
    }
    setDetailTarget(null)
  }

  function handleAddPantry(draft: { name: string; kcalPer100g: number; dailyG: number }) {
    const id = newId()
    setPantry((prev) => [...prev, touch({ id, emoji: '🥫', ...draft })])
    markDirty('pantry_items', id)
  }

  function handleSetPantryGrams(id: string, grams: number) {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? touch({ ...c, pantryOverrides: { ...(c.pantryOverrides ?? {}), [id]: grams } })
          : c
      )
    )
    if (activeCycleId) markDirty('cycles', activeCycleId)
  }

  function handleRemovePantry(id: string) {
    Alert.alert('Remove staple', 'Remove this pantry staple?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setPantry((prev) => prev.map((p) => (p.id === id ? tombstone(p) : p)))
          markDirty('pantry_items', id)
        },
      },
    ])
  }

  function handleSetDefaultGrams(id: string, dailyG: number) {
    setPantry((prev) => prev.map((p) => (p.id === id ? touch({ ...p, dailyG }) : p)))
    markDirty('pantry_items', id)
  }

  function handleResetPantryOverride(id: string) {
    setCycles((prev) =>
      prev.map((c) => {
        if (c.id !== activeCycleId) return c
        const { [id]: _, ...rest } = c.pantryOverrides ?? {}
        return touch({ ...c, pantryOverrides: rest })
      })
    )
    if (activeCycleId) markDirty('cycles', activeCycleId)
  }

  function handleConfirmReceipt(items: FoodItem[]) {
    handleAddItems(items)
    setReviewVisible(false)
  }

  function handleAddManual() {
    setScanBarcode(null)
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

  // Deleting the account removes it in the cloud, then resets this device to empty so no
  // personal data or stale sync state is left behind.
  function handleDeleteAccount() {
    authService.deleteAccount()
    setAccount(null)
    handleClearAll()
    void clearSyncMetadata(AsyncStorage)
  }

  const extraDates = liveExtraMeals.map((e) => e.date)
  const activeCycle = liveCycles.find((c) => c.id === activeCycleId) ?? null
  const activeDayCount = activeCycle
    ? daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    : prefs.defaultDays

  // Collapse the expanded basket whenever its view is no longer on screen, so the
  // collapsed calendar/budget don't get stuck hidden after navigating away.
  const basketViewShown =
    !activeExtraDate && !!activeCycle && activeCycle.items.length > 0 && weeklyTab === 'basket'
  useEffect(() => {
    if (!basketViewShown && basketExpanded) toggleBasketExpanded(false)
  }, [basketViewShown, basketExpanded])

  let barMealPrep = 0
  let barPantry = 0
  let barExtra = 0
  let barBudget = dailyGoal
  let barMacros: Macros | undefined
  let barDays: number | undefined
  if (activeExtraDate) {
    const containing = liveCycles.find(
      (c) => activeExtraDate >= c.startDate && activeExtraDate <= c.endDate
    )
    if (containing) {
      const days = daysBetween(containing.startDate, containing.endDate) + 1
      barMealPrep = totalKcal(containing.items)
      barPantry = pantryKcalForCycle(livePantry, containing, days)
      barExtra = extrasKcalInRange(liveExtraMeals, containing.startDate, containing.endDate)
      barBudget = cycleBudget(days, dailyGoal)
      barMacros = aggregateMacros(containing.items, barPantry + barExtra)
      barDays = days
    } else {
      barExtra = extrasKcalOnDate(liveExtraMeals, activeExtraDate)
      barBudget = dailyGoal
    }
  } else if (activeCycle) {
    const days = daysBetween(activeCycle.startDate, activeCycle.endDate) + 1
    barMealPrep = totalKcal(activeCycle.items)
    barPantry = pantryKcalForCycle(livePantry, activeCycle, days)
    barExtra = extrasKcalInRange(liveExtraMeals, activeCycle.startDate, activeCycle.endDate)
    barBudget = cycleBudget(days, dailyGoal)
    barMacros = aggregateMacros(activeCycle.items, barPantry + barExtra)
    barDays = days
  }
  const extrasForActiveDate = activeExtraDate
    ? liveExtraMeals.filter((e) => e.date === activeExtraDate)
    : []
  const extrasForPeriod = activeCycle
    ? liveExtraMeals.filter((e) => e.date >= activeCycle.startDate && e.date <= activeCycle.endDate)
    : []

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height
            if (h && !headerH) setHeaderH(h)
          }}
          style={collapseStyle(headerH)}
        >
          <View testID="app-header" style={styles.header}>
            <View>
              <Text style={styles.greeting}>{prefs.name ? `Hi, ${prefs.name}` : 'Hi there'} 👋</Text>
              <Text style={styles.subtitle}>{formatLong(today)}</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity testID="open-pantry" onPress={() => setPantryVisible(true)} style={[styles.iconBtn, styles.headerBtnSpacer]}>
                <Text style={styles.iconBtnText}>🥫</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="open-settings" onPress={() => setSettingsVisible(true)} style={styles.iconBtn}>
                <Text style={styles.iconBtnText}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        <Animated.View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height
            if (h && !calH) setCalH(h)
          }}
          style={collapseStyle(calH)}
        >
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
                cycles={liveCycles}
                windowStart={windowStart}
                totalDays={TOTAL_DAYS}
                activeCycleId={activeCycleId}
                onCyclePress={handleCyclePress}
                onCreatePeriod={handleCreatePeriod}
                dayWidth={DAY_WIDTH}
              />
            </View>
          </ScrollView>
        </Animated.View>
        {activeExtraDate ? (
          <View style={styles.detailArea}>
            <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} macros={barMacros} macroTargets={prefs.macroTargets} days={barDays} />
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
              <View style={styles.newShopArea}>
                <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} macros={barMacros} macroTargets={prefs.macroTargets} days={barDays} />
                {weeklyTab === 'basket' && (
                  <NewPeriodPanel
                    dayCount={activeDayCount}
                    startDate={activeCycle.startDate}
                    dailyGoal={dailyGoal}
                    onDaysChange={handleChangeDays}
                    onScanBarcode={handleScanBarcode}
                    onScanReceipt={handleScanReceipt}
                  />
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
                    pantry={livePantry}
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
            {activeCycle && activeCycle.items.length > 0 && (
              <View style={styles.detailArea}>
                <Animated.View
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height
                    if (h && !budgetH) setBudgetH(h)
                  }}
                  style={collapseStyle(budgetH)}
                >
                  <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} macros={barMacros} macroTargets={prefs.macroTargets} days={barDays} />
                </Animated.View>
                {weeklyTab === 'basket' && (
                  <DragHandleCard
                    testID="open-basket-page"
                    style={styles.basketSheet}
                    backgroundColor={colors.matcha}
                    handleColor="rgba(255,255,255,0.7)"
                    expanded={basketExpanded}
                    onExpand={() => toggleBasketExpanded(true)}
                    onCollapse={() => toggleBasketExpanded(false)}
                  >
                    {basketExpanded ? (
                      <Animated.View style={[styles.expandedHead, { opacity: expandAnim }]}>
                        <Text style={styles.expandedTitle}>Full basket</Text>
                        <TouchableOpacity testID="basket-done" onPress={() => toggleBasketExpanded(false)} style={styles.doneBtn}>
                          <Text style={styles.doneTxt}>Done</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    ) : (
                      <Text style={styles.basketSheetTitle}>This basket · pull up for full view</Text>
                    )}
                    <MealPrepDetail
                      activeCycle={activeCycle}
                      onEditItem={handleEditItem}
                      headerContent={
                        basketExpanded ? (
                          <Animated.View
                            style={{
                              opacity: expandAnim,
                              transform: [{ translateY: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                            }}
                          >
                            <BasketCharts
                              consumed={barMealPrep + barPantry + barExtra}
                              budget={barBudget}
                              mealPrep={barMealPrep}
                              pantry={barPantry}
                              extra={barExtra}
                              macros={barMacros ?? { protein: 0, carbs: 0, fat: 0 }}
                              macroTargets={prefs.macroTargets}
                              days={barDays ?? activeDayCount}
                              itemCount={activeCycle.items.length}
                              totalWeightG={activeCycle.items.reduce((s, i) => s + (i.weightG || 0), 0)}
                            />
                          </Animated.View>
                        ) : undefined
                      }
                    />
                  </DragHandleCard>
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
                    pantry={livePantry}
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
          customFoods={customFoods}
          scanned={scanBarcode != null}
          saveForLater={saveForLater}
          onSaveForLater={setSaveForLater}
          keepScanning={keepScanning}
          onKeepScanning={setKeepScanning}
          onAdd={handleAddItem}
          onScanBarcode={() => { setSheetVisible(false); handleScanBarcode() }}
          onScanReceipt={() => { setSheetVisible(false); handleScanReceipt() }}
          onClose={() => { setSheetVisible(false); setScanBarcode(null) }}
        />
        <ReceiptReviewSheet
          visible={reviewVisible}
          lines={reviewLines}
          onConfirm={handleConfirmReceipt}
          onClose={() => setReviewVisible(false)}
        />
        {(receiptScanning || barcodeLooking) && (
          <View style={styles.loadingScrim} pointerEvents="auto">
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.matcha} />
              <Text style={styles.loadingText}>{receiptScanning ? 'Reading your receipt…' : 'Looking up barcode…'}</Text>
            </View>
          </View>
        )}
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
          onDeleteAccount={handleDeleteAccount}
          authService={authService}
          sync={account ? 'synced' : 'offline'}
          version={APP_VERSION}
          onOpenMyFoods={() => setMyFoodsVisible(true)}
        />
        <CustomFoodsScreen
          visible={myFoodsVisible}
          foods={customFoods}
          onClose={() => setMyFoodsVisible(false)}
          onSave={(food) => setCustomFoods((prev) => prev.map((x) => (x.id === food.id ? food : x)))}
          onDelete={(id) => setCustomFoods((prev) => prev.filter((x) => x.id !== id))}
        />
        <PantryScreen
          visible={pantryVisible}
          pantry={livePantry}
          onAdd={handleAddPantry}
          onRemove={handleRemovePantry}
          onClose={() => setPantryVisible(false)}
          cycle={activeCycle}
          cycleDays={activeDayCount}
          onSetDefaultGrams={handleSetDefaultGrams}
          onSetPantryGrams={handleSetPantryGrams}
          onResetPantryOverride={handleResetPantryOverride}
          onOpenPantry={(id) => setDetailTarget({ kind: 'pantry', id })}
        />
        {detailTarget && (
          <ItemDetail
            visible
            kind={detailTarget.kind}
            item={detailTarget.kind === 'item' ? activeCycle?.items[detailTarget.index] : undefined}
            extra={detailTarget.kind === 'extra' ? liveExtraMeals.find((e) => e.id === detailTarget.id) : undefined}
            pantryItem={detailTarget.kind === 'pantry' ? livePantry.find((p) => p.id === detailTarget.id) : undefined}
            days={activeDayCount}
            dateLabel={
              detailTarget.kind === 'extra'
                ? (() => {
                    const e = liveExtraMeals.find((x) => x.id === detailTarget.id)
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
                setCycles((prev) => prev.map((c) => (c.id === carryOver.newCycleId ? touch({ ...c, items: [...c.items, ...carried] }) : c)))
                markDirty('cycles', carryOver.newCycleId)
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
            pantry={livePantry}
            extras={liveExtraMeals}
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
