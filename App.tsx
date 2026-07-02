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
  Pressable,
  SafeAreaView,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()
import FadeBackground from './src/components/FadeBackground'
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
import ExtraMealSheet from './src/components/ExtraMealSheet'
import SettingsScreen from './src/components/SettingsScreen'
import PantryScreen from './src/components/PantryScreen'
import ItemDetail from './src/components/ItemDetail'
import CarryOverSheet from './src/components/CarryOverSheet'
import { CanIcon, SettingsIcon } from './src/components/icons'
import { cycles as initialCycles, extraMeals as initialExtraMeals, DAILY_KCAL_GOAL, pantry as initialPantry, DEFAULT_PREFERENCES } from './src/data'
import { todayISO, addDays, daysBetween, formatDay, formatLong } from './src/utils/dates'
import { totalKcal, cycleBudget, extrasKcalInRange, extrasKcalOnDate, pantryKcalForCycle, pantryGramsForCycle, aggregateMacros } from './src/utils/nutrition'
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
import OnboardingScreen, { OnboardingResult } from './src/components/OnboardingScreen'
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

function AppInner({ prefs, setPrefs }: { prefs: Preferences; setPrefs: React.Dispatch<React.SetStateAction<Preferences>> }) {
  const colors = useColors()
  const [today, setToday] = useState(todayISO)
  const windowStart = useMemo(() => addDays(today, -WINDOW_OFFSET), [today])

  const styles = useMemo(() => StyleSheet.create({
    // Three visually distinct horizontal bands, getting greener top -> bottom:
    // header (lightest) over the calendar zone (mid) over the detail panel (deepest).
    safe: {
      flex: 1,
      backgroundColor: colors.sageBg,
    },
    container: {
      flex: 1,
      backgroundColor: colors.sageBg,
    },
    calendarSection: {
      backgroundColor: colors.sageBg,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(44,58,30,0.08)',
      shadowColor: '#2C3A1E',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      backgroundColor: colors.sageBg,
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
    // Content below the calendar. A sage→white FadeBackground sits absolutely behind this
    // (top of detailArea); the white BudgetBar card floats on top of the tinted area.
    detailArea: {
      paddingTop: 20,
      position: 'relative',
    },
    grab: {
      width: 38,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.line,
      alignSelf: 'center',
      marginBottom: 10,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 56,
      paddingHorizontal: 40,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyHead: {
      fontFamily: fonts.head,
      fontWeight: '700',
      fontSize: 20,
      color: colors.forest,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySub: {
      fontFamily: fonts.bodySemi,
      fontSize: 14,
      color: colors.mossFaint,
      textAlign: 'center',
      lineHeight: 20,
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
    // Sizes to its content inside the single page scroll (no flex:1 — that would clip the
    // list to the viewport and stop it scrolling past the pinned nav).
    basketSheet: {
      marginTop: 10,
      paddingBottom: 14,
      paddingTop: 16,
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
      color: colors.forest,
    },
    expandedMeta: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.mossFaint,
    },
    // The nav + add button float over the bottom of the page scroll. The bar itself
    // is the positioning context for the absolutely-placed SegmentedNav and AddFab,
    // so it needs an explicit height for them to anchor against.
    pinnedBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 68,
      paddingHorizontal: 16,
      paddingBottom: 10,
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
  const [carryOver, setCarryOver] = useState<{ newCycleId: string; prevCycle: MealPrepCycle } | null>(null)
  const [timelineEditing, setTimelineEditing] = useState(false)
  const exitTimelineEditRef = useRef<(() => void) | null>(null)
  // Horizontal calendar auto-scroll target.
  const scrollRef = useRef<ScrollView>(null)
  // Pending "keep scanning" relaunch timer, cancelled on unmount so it can't fire post-teardown.
  const rescanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Guards against overlapping passes: the debounce, foreground, and sign-in triggers can all
  // call runSync. Two passes reading the same pre-merge snapshot stomp each other, so if one is
  // already in flight we ask it to run once more when it finishes instead of racing.
  const syncingRef = useRef(false)
  const syncAgainRef = useRef(false)

  /** One sync pass per table: push dirty rows, pull remote changes, merge. Only updates
   *  state when something actually changed, so it can't loop with the debounced trigger. */
  const runSync = useCallback(async () => {
    const eng = engineRef.current
    if (!eng) {
      console.log('[sync] skipped — no engine (not signed in or Supabase not configured)')
      return
    }
    if (syncingRef.current) {
      syncAgainRef.current = true
      return
    }
    syncingRef.current = true
    try {
      do {
        syncAgainRef.current = false
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
      } while (syncAgainRef.current)
    } finally {
      syncingRef.current = false
    }
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

  // Sync when the app returns to the foreground (also covers reconnect after offline), and
  // refresh "today" in case the app was backgrounded across midnight.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setToday((prev) => { const t = todayISO(); return t !== prev ? t : prev })
        void runSync()
      }
    })
    return () => sub.remove()
  }, [runSync])

  // Debounced sync after local edits settle.
  useEffect(() => {
    if (!hydrated || !engineRef.current) return
    const t = setTimeout(() => void runSync(), SYNC_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [cycles, extraMeals, pantry, hydrated, runSync])

  // Cancel a pending keep-scanning relaunch if the app unmounts first.
  useEffect(() => () => { if (rescanTimerRef.current) clearTimeout(rescanTimerRef.current) }, [])

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
    if (todays) {
      setActiveCycleId(todays.id)
      const startIdx = daysBetween(windowStart, todays.startDate)
      scrollRef.current?.scrollTo({ x: Math.max(0, startIdx * DAY_WIDTH), animated: false })
    }
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
    // An empty meal prep is a deliberate creation — keep it when switching away
    // (it stays in the timeline as a "New shop" pill) instead of GC-ing it.
    setActiveCycleId(nextCycleId)
    setActiveExtraDate(nextExtraDate)
    // A standalone extra-day has no basket/pantry, so land on the Extras tab.
    setWeeklyTab(nextExtraDate ? 'extras' : 'basket')
    // Clear any stale drum-picker preview so the newly-selected pill renders
    // at its real length, not the last previewed length from another cycle.
    setPreviewDays(null)
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

  function handleCreatePeriod(startDate: string) {
    const id = newId()
    const newCycle = touch({ id, startDate, endDate: addDays(startDate, prefs.defaultDays - 1), items: [] })
    const prevCycle = liveCycles
      .filter((c) => c.items.length > 0)
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

  const [previewDays, setPreviewDays] = React.useState<number | null>(null)

  function handleChangeDays(days: number) {
    setPreviewDays(null)
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeCycleId
          ? touch({ ...c, endDate: addDays(c.startDate, days - 1) })
          : c
      )
    )
    if (activeCycleId) markDirty('cycles', activeCycleId)
  }

  function handleSetCycleDates(id: string, startDate: string, endDate: string) {
    setCycles((prev) => prev.map((c) => (c.id === id ? touch({ ...c, startDate, endDate }) : c)))
    markDirty('cycles', id)
  }

  // Deletes directly — call when the user has already confirmed (e.g. via ConfirmDialog).
  function deleteCycle(id: string) {
    setCycles((prev) => prev.map((c) => (c.id === id ? tombstone(c) : c)))
    markDirty('cycles', id)
    if (activeCycleId === id) setActiveCycleId(null)
  }

  // Shows native Alert first — use when there's no prior in-app confirmation.
  function handleDeleteCycle(id: string) {
    Alert.alert('Delete this batch?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCycle(id) },
    ])
  }

  async function handleScanBarcode() {
    const barcode = await scanBarcodeWithCamera()
    if (!barcode) return
    setScanBarcode(barcode)
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
        `No match for barcode ${barcode}.\n\nCheck this is the code on the pack, as scanners sometimes grab a nearby barcode. If your connection is patchy, try again. Otherwise add it manually below and it'll be saved so the next scan finds it instantly.`,
      )
    }
    // Found items are trusted from the DB — only "remember" them once the user taps Edit
    // (handled in the sheet). Not-found items are typed from scratch, so default to saving.
    setSaveForLater(product == null)
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
      rescanTimerRef.current = setTimeout(() => { handleScanBarcode() }, 450)
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

  function handleSavePantryPatch(id: string, patch: { name?: string; kcalPer100g: number; dailyG: number }) {
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

  // When a day is tapped that falls inside a batch, show that batch's content.
  const containingCycle = activeExtraDate
    ? liveCycles.find((c) => activeExtraDate >= c.startDate && activeExtraDate <= c.endDate) ?? null
    : null

  // The cycle driving the Batch/Pantry/Extras view: directly-selected takes priority.
  const viewedCycle = activeCycle ?? containingCycle

  const activeDayCount = viewedCycle
    ? daysBetween(viewedCycle.startDate, viewedCycle.endDate) + 1
    : prefs.defaultDays

  // When the new-period panel is visible the drum picker needs exclusive horizontal
  // gesture control — disable the outer vertical scroll to prevent conflict.
  const showingNewPeriod = !activeExtraDate && !!activeCycle && activeCycle.items.length === 0 && weeklyTab === 'basket'

  let barMealPrep = 0
  let barPantry = 0
  let barExtra = 0
  let barBudget = dailyGoal
  let barMacros: Macros | undefined
  let barDays: number | undefined
  if (viewedCycle) {
    const days = daysBetween(viewedCycle.startDate, viewedCycle.endDate) + 1
    barMealPrep = totalKcal(viewedCycle.items)
    barPantry = pantryKcalForCycle(livePantry, viewedCycle, days)
    barExtra = extrasKcalInRange(liveExtraMeals, viewedCycle.startDate, viewedCycle.endDate)
    barBudget = cycleBudget(days, dailyGoal)
    barMacros = aggregateMacros(viewedCycle.items, barPantry + barExtra)
    barDays = days
  } else if (activeExtraDate) {
    barExtra = extrasKcalOnDate(liveExtraMeals, activeExtraDate)
    barBudget = dailyGoal
  }

  // Extras for the Extras tab: whole period's extras, selected day floated to top.
  const extrasForPeriod: ExtraMeal[] = viewedCycle
    ? (() => {
        const pivotDate = activeExtraDate ?? today
        const all = liveExtraMeals.filter(
          (e) => e.date >= viewedCycle.startDate && e.date <= viewedCycle.endDate
        )
        return [
          ...all.filter((e) => e.date === pivotDate),
          ...all.filter((e) => e.date !== pivotDate).sort((a, b) => a.date.localeCompare(b.date)),
        ]
      })()
    : activeExtraDate
      ? liveExtraMeals.filter((e) => e.date === activeExtraDate)
      : []

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: showingNewPeriod ? 0 : 140 }}
          scrollEnabled={!showingNewPeriod}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.calendarSection}>
            <View testID="app-header" style={styles.header}>
              <View>
                <Text style={styles.greeting}>{`Hi, ${prefs.name || 'friend'}`} 👋</Text>
                <Text style={styles.subtitle}>{formatLong(today)}</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity testID="open-pantry" onPress={() => setPantryVisible(true)} style={[styles.iconBtn, styles.headerBtnSpacer]}>
                  <CanIcon size={20} color={colors.forest} />
                </TouchableOpacity>
                <TouchableOpacity testID="open-settings" onPress={() => setSettingsVisible(true)} style={styles.iconBtn}>
                  <SettingsIcon size={20} color={colors.forest} />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
                scrollEnabled={!timelineEditing}
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
                    dimmed={timelineEditing}
                  />
                  <TimelineView
                    cycles={liveCycles}
                    windowStart={windowStart}
                    totalDays={TOTAL_DAYS}
                    activeCycleId={activeCycleId}
                    onCyclePress={handleCyclePress}
                    onCreatePeriod={handleCreatePeriod}
                    dayWidth={DAY_WIDTH}
                    onSetCycleDates={handleSetCycleDates}
                    onDeleteCycle={deleteCycle}
                    onEditingChange={setTimelineEditing}
                    onEditModeChange={(active, fn) => { exitTimelineEditRef.current = active ? (fn ?? null) : null }}
                    previewEndDate={previewDays && activeCycle ? addDays(activeCycle.startDate, previewDays - 1) : undefined}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
          <Pressable onPress={() => exitTimelineEditRef.current?.()}>
          {!viewedCycle && !activeExtraDate ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🥗</Text>
              <Text style={styles.emptyHead}>Nothing prepped yet</Text>
              <Text style={styles.emptySub}>Tap + on the timeline to start a new batch, or tap an existing one to view it</Text>
            </View>
          ) : !viewedCycle ? (
            // Standalone extra day not inside any batch — only Extras tab is meaningful.
            <View style={styles.detailArea}>
              <FadeBackground color={colors.sageBg2} height={480} curve={0.6} />
              <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} macros={barMacros} macroTargets={prefs.macroTargets} days={barDays} />
              <ExtrasPeriodList
                extras={extrasForPeriod}
                onOpenExtra={(id) => setDetailTarget({ kind: 'extra', id })}
              />
            </View>
          ) : (
            // Has a viewed cycle — either directly selected or inferred from the tapped day.
            <View style={styles.detailArea}>
              <FadeBackground color={colors.sageBg2} height={480} curve={0.6} />
              <BudgetBar mealPrepKcal={barMealPrep} pantryKcal={barPantry} extraKcal={barExtra} budgetKcal={barBudget} macros={barMacros} macroTargets={prefs.macroTargets} days={barDays} />
              {weeklyTab === 'basket' && (
                activeCycle && activeCycle.items.length === 0 ? (
                  <NewPeriodPanel
                    dayCount={activeDayCount}
                    startDate={activeCycle.startDate}
                    dailyGoal={dailyGoal}
                    onDaysChange={handleChangeDays}
                    onDaysPreview={setPreviewDays}
                    onScanBarcode={handleScanBarcode}
                    onScanReceipt={handleScanReceipt}
                  />
                ) : (
                  <View style={styles.basketSheet}>
                    <View style={styles.expandedHead}>
                      <Text style={styles.expandedTitle}>This batch</Text>
                      <Text style={styles.expandedMeta}>
                        {viewedCycle.items.length} item{viewedCycle.items.length !== 1 ? 's' : ''}{barMealPrep > 0 ? ` · ${barMealPrep.toLocaleString()} kcal` : ''}
                      </Text>
                    </View>
                    <MealPrepDetail activeCycle={viewedCycle} onEditItem={activeCycle ? handleEditItem : undefined} />
                  </View>
                )
              )}
              {weeklyTab === 'extras' && (
                <ExtrasPeriodList
                  extras={extrasForPeriod}
                  onOpenExtra={(id) => setDetailTarget({ kind: 'extra', id })}
                />
              )}
              {weeklyTab === 'pantry' && (
                <PantryPeriodView
                  cycle={viewedCycle}
                  pantry={livePantry}
                  cycleDays={activeDayCount}
                  onOpenPantry={(id) => setDetailTarget({ kind: 'pantry', id })}
                />
              )}
            </View>
          )}
          </Pressable>
        </ScrollView>
        {/* Pinned nav + add button: rendered once, floating over the bottom of the page
            scroll. box-none lets touches fall through the empty bar to the scroll behind. */}
        <View style={styles.pinnedBar} pointerEvents="box-none">
          {(viewedCycle || activeExtraDate) ? (
            <>
              <View style={[styles.navWrap, weeklyTab === 'pantry' && styles.navWrapFull]}>
                <SegmentedNav active={weeklyTab} onChange={setWeeklyTab} />
              </View>
              {activeCycle ? (
                // Directly-selected batch: full add options on Batch + Extras tabs.
                weeklyTab !== 'pantry' && (
                  <AddFab
                    manualOnly={weeklyTab === 'extras'}
                    onScanBarcode={handleScanBarcode}
                    onScanReceipt={handleScanReceipt}
                    onAddManual={weeklyTab === 'extras' ? handleAddExtraForPeriod : handleAddManual}
                  />
                )
              ) : (
                // Day tapped (inside a batch or standalone): only Extras tab can add.
                weeklyTab === 'extras' && (
                  <AddFab manualOnly onAddManual={handleAddExtra} />
                )
              )}
            </>
          ) : null}
        </View>
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
          customFoods={customFoods}
          onSaveFood={(food) => setCustomFoods((prev) => prev.map((x) => (x.id === food.id ? food : x)))}
          onDeleteFood={(id) => setCustomFoods((prev) => prev.filter((x) => x.id !== id))}
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
            pantryWeekG={
              detailTarget.kind === 'pantry' && activeCycle
                ? pantryGramsForCycle(livePantry.find((p) => p.id === detailTarget.id)!, activeCycle, activeDayCount)
                : undefined
            }
            onSaveItem={(patch) => { if (detailTarget.kind === 'item') handleSaveItemPatch(detailTarget.index, patch) }}
            onSaveExtra={(patch) => { if (detailTarget.kind === 'extra') handleSaveExtraPatch(detailTarget.id, patch) }}
            onSavePantry={(patch) => {
              if (detailTarget.kind !== 'pantry') return
              handleSavePantryPatch(detailTarget.id, { name: patch.name, kcalPer100g: patch.kcalPer100g, dailyG: patch.dailyG })
              handleSetPantryGrams(detailTarget.id, patch.thisWeekG)
            }}
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
      </View>
    </SafeAreaView>
    {(receiptScanning || barcodeLooking) && (
      <View style={styles.loadingScrim} pointerEvents="auto">
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.matcha} />
          <Text style={styles.loadingText}>{receiptScanning ? 'Reading your receipt…' : 'Looking up barcode…'}</Text>
        </View>
      </View>
    )}
    </View>
  )
}

const ONBOARDED_KEY = 'basket:v1:onboarded'

export default function App() {
  const [fontsLoaded] = useFonts(fontMap)
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [prefsHydrated, setPrefsHydrated] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)

  useEffect(() => {
    loadPrefs().then((p) => { setPrefs(p); setPrefsHydrated(true) })
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === '1'))
  }, [])

  useEffect(() => {
    if (fontsLoaded && onboarded !== null) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, onboarded])

  useEffect(() => { if (prefsHydrated) savePrefs(prefs) }, [prefs, prefsHydrated])

  function handleOnboardingComplete(result: OnboardingResult) {
    setPrefs((p) => ({
      ...p,
      ...(result.name != null ? { name: result.name } : {}),
      ...(result.defaultDays != null ? { defaultDays: result.defaultDays } : {}),
      ...(result.weightUnit != null ? { units: { ...p.units, weight: result.weightUnit } } : {}),
    }))
    if (result.dailyGoal != null) {
      // dailyGoal lives outside prefs — persisted by AppInner; pre-write so it's ready on mount.
      void saveDailyGoal(result.dailyGoal)
    }
    void AsyncStorage.setItem(ONBOARDED_KEY, '1')
    setOnboarded(true)
  }

  if (!fontsLoaded || onboarded === null) return null

  return (
    <ThemeProvider theme={prefs.theme} accent={prefs.accent}>
      <UnitsProvider units={prefs.units}>
        {!onboarded ? (
          <OnboardingScreen
            onComplete={handleOnboardingComplete}
            onSignIn={() => {
              // Mark onboarded and drop into the main app; AuthSheet opens from Settings.
              void AsyncStorage.setItem(ONBOARDED_KEY, '1')
              setOnboarded(true)
            }}
          />
        ) : (
          <AppInner prefs={prefs} setPrefs={setPrefs} />
        )}
      </UnitsProvider>
    </ThemeProvider>
  )
}
