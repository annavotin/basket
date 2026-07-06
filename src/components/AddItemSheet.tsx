import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import Stepper from './settings/Stepper'
import Toggle from './settings/Toggle'
import NutritionFields from './NutritionFields'
import { BarcodeIcon, ReceiptIcon, EditIcon, PlusIcon } from './icons'
import { Product } from '../mockProducts'
import { FoodItem, Macros, CustomFood, NutritionBasis } from '../types'
import { kcalForWeight } from '../utils/nutrition'
import { findCustomByBarcode, findCustomByName } from '../services/customFoods'
import { useFoodSearch } from '../hooks/useFoodSearch'
import { FoodSuggestion, Serving } from '../foods'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'

type Props = {
  visible: boolean
  product: Product | null
  onAdd: (item: FoodItem, opts: { save: boolean; barcode?: string }) => void
  onClose: () => void
  onScanBarcode?: () => void
  onScanReceipt?: () => void
  onScanForBarcode?: () => Promise<string | null>
  customFoods?: CustomFood[]
  scanned?: boolean
  scanBarcode?: string | null
  keepScanning?: boolean
  onKeepScanning?: (next: boolean) => void
  basis: NutritionBasis
  onBasisChange: (b: NutritionBasis) => void
}

function macrosEqual(a?: Macros, b?: Macros): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return a.protein === b.protein && a.carbs === b.carbs && a.fat === b.fat
}

export default function AddItemSheet({ visible, product, onAdd, onClose, onScanBarcode, onScanReceipt, onScanForBarcode, customFoods = [], scanned = false, scanBarcode = null, keepScanning = false, onKeepScanning, basis, onBasisChange }: Props) {
  const colors = useColors()
  const units = useUnits()
  const isManual = product === null
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [qty, setQty] = useState(1)
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>(undefined)
  // Manual mode: has a search suggestion been picked? Drives layout (custom-add card vs.
  // weight/unit picker) independent of kcalPer100g, which NutritionFields now writes to
  // directly as the user types — that must not itself flip the layout.
  const [pickedSuggestion, setPickedSuggestion] = useState(false)
  const [emoji, setEmoji] = useState('🛒')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [servings, setServings] = useState<Serving[]>([])
  const [servingIdx, setServingIdx] = useState<number | null>(null) // null = custom g input
  // Found scans open as a read-only summary; tapping Edit reveals the editable fields.
  const [editing, setEditing] = useState(false)
  // Always-visible "Save to My Foods" toggle, default on.
  const [saveToFoods, setSaveToFoods] = useState(true)
  // Barcode linked to a manual/custom item via the "Link a barcode" flow (distinct from
  // scanBarcode, which comes from an actual scanned product match).
  const [linkedBarcode, setLinkedBarcode] = useState<string | null>(null)
  // Snapshot of the picked/scanned food's starting values, for dirty-checking. null means
  // there's no prior version to compare against — this is a brand-new (fully custom) food.
  const [original, setOriginal] = useState<{ weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros } | null>(null)
  const nameInputRef = useRef<TextInput>(null)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.cream,
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      padding: 10, paddingHorizontal: 22, paddingBottom: 30,
      maxHeight: '96%',
    },
    grab: {
      width: 40, height: 5, borderRadius: 3, backgroundColor: colors.sage100,
      alignSelf: 'center', marginTop: 6, marginBottom: 12,
    },
    sheetTitle: {
      fontFamily: fonts.head,
      fontSize: 21, color: colors.forest, marginBottom: 2,
    },
    sheetDesc: {
      fontFamily: fonts.display,
      fontSize: 13, color: colors.moss, marginBottom: 10,
    },

    // ── Scan row ──────────────────────────────────────────────────────────────
    scanRow: {
      flexDirection: 'row', gap: 10, marginBottom: 12,
    },
    scanBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: 50, paddingVertical: 13, paddingHorizontal: 6,
      backgroundColor: colors.forest,
    },
    scanBtnReceipt: {
      backgroundColor: colors.matcha600,
    },
    scanBtnText: {
      fontFamily: fonts.display,
      fontSize: 13, color: colors.white, fontWeight: '600',
    },

    // ── Search bar ────────────────────────────────────────────────────────────
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: 50, borderWidth: 1.5, borderColor: colors.line,
      paddingHorizontal: 14, paddingVertical: 0,
      marginBottom: 8, height: 48,
    },
    searchIcon: {
      fontSize: 16, color: colors.mossFaint, marginRight: 8,
    },
    searchInput: {
      flex: 1, fontSize: 15,
      fontFamily: fonts.display,
      color: colors.forest, paddingVertical: 0,
    },
    searchClear: {
      paddingLeft: 8, paddingVertical: 4,
    },
    searchClearText: {
      fontSize: 14, color: colors.mossFaint, fontFamily: fonts.display,
    },

    // ── Suggestion list ───────────────────────────────────────────────────────
    suggestionList: {
      maxHeight: 220, marginBottom: 8,
    },
    suggestionCard: {
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: colors.white, borderRadius: 16,
      padding: 13, paddingHorizontal: 14,
      marginBottom: 9,
      shadowColor: colors.forest, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    suggestionAv: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: colors.sageBg2,
      alignItems: 'center', justifyContent: 'center',
    },
    suggestionEmoji: { fontSize: 21 },
    suggestionTx: { flex: 1, minWidth: 0 },
    suggestionName: {
      fontFamily: fonts.displayMedium,
      fontSize: 15.5, color: colors.forest,
    },
    suggestionMeta: {
      fontFamily: fonts.display,
      fontSize: 12, color: colors.mossFaint, marginTop: 1,
    },
    suggestionMetaNum: {
      fontFamily: fonts.num,
      fontSize: 12, color: colors.mossFaint,
    },
    suggestionAdd: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: colors.matcha,
      alignItems: 'center', justifyContent: 'center',
    },
    searching: { padding: 12, fontSize: 14, fontFamily: fonts.body, color: colors.moss },

    // ── Custom-add card (.cnew/.qnew) ─────────────────────────────────────────
    customCard: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.matcha600,
      borderRadius: 16, padding: 14, backgroundColor: colors.sageBg2,
      marginBottom: 10,
    },
    customCardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
    },
    customCardAv: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: colors.white,
      alignItems: 'center', justifyContent: 'center',
    },
    customCardEmoji: { fontSize: 21 },
    customCardName: {
      fontFamily: fonts.display, fontSize: 15, color: colors.forest, flex: 1,
    },

    // ── Field row (used inside custom card) ───────────────────────────────────
    fieldRow: { flexDirection: 'row', gap: 11, marginBottom: 12 },
    field: { flex: 1 },
    fieldLabel: {
      fontFamily: fonts.display,
      fontSize: 12, color: colors.moss, fontWeight: '700', marginBottom: 6,
    },
    fieldInput: {
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
      borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13,
      fontFamily: fonts.display, fontSize: 15, color: colors.forest,
    },
    fieldInputFull: {
      width: '100%',
    },

    // ── Product summary (scanned / picked) ────────────────────────────────────
    productSummary: {
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: colors.white, borderRadius: 18,
      padding: 12, marginBottom: 10,
      // Stronger + zIndex'd so its shadow reads on top of the nutrition card tucked
      // in behind it, making the seam between the two obvious despite no gap.
      shadowColor: colors.forest, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14, shadowRadius: 10, elevation: 4, zIndex: 2,
    },
    productAv: {
      width: 52, height: 52, borderRadius: 16,
      backgroundColor: colors.sageBg2,
      alignItems: 'center', justifyContent: 'center',
    },
    productEmoji: { fontSize: 28 },
    productTx: { flex: 1 },
    productName: {
      fontFamily: fonts.display, fontSize: 16, color: colors.forest,
    },
    productMeta: {
      fontFamily: fonts.display, fontSize: 12, color: colors.mossFaint, marginTop: 2,
    },
    productKcal: {
      fontFamily: fonts.display, fontWeight: '600', fontSize: 15, color: colors.matchaDeep,
      textAlign: 'right',
    },
    productKcalSmall: {
      fontFamily: fonts.display, fontSize: 9, color: colors.mossFaint, fontWeight: '700',
      textAlign: 'right', letterSpacing: 0.4,
    },

    // ── Pack size — always-visible weight row below the tile, own breathing room ──
    packSizeWrap: {
      marginBottom: 8,
    },

    // ── Nutrition card — tucked under the tile above by the negative marginTop, so the
    // tile keeps its full corner radius and this reads as "attached from the top". ──
    nutritionCard: {
      // Subtly tinted vs. the tile's pure white so the seam reads even where the two
      // cards touch with no gap between them.
      backgroundColor: colors.sageBg2,
      borderRadius: 16,
      marginTop: -16,
      // 16 clears the tuck under the tile (matches marginTop above); the rest matches the
      // horizontal/bottom padding so all four sides read as evenly spaced.
      paddingHorizontal: 18, paddingBottom: 18, paddingTop: 16 + 10,
      shadowColor: colors.forest, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 5, elevation: 1, zIndex: 1,
    },

    // ── Weight + qty section ──────────────────────────────────────────────────
    sectionLabel: {
      fontFamily: fonts.display,
      fontSize: 12, color: colors.moss, fontWeight: '700',
      marginTop: 10, marginBottom: 6,
    },
    weightInput: {
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
      borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13,
      fontFamily: fonts.display, fontSize: 15, color: colors.forest,
      marginBottom: 4,
    },

    // ── Qty row (label + shared Stepper) ──────────────────────────────────────
    qtyRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 10, marginBottom: 6,
    },

    // ── Scan toggles (scanned mode only) ──────────────────────────────────────
    toggleGroup: {
      backgroundColor: colors.white, borderRadius: 16,
      paddingHorizontal: 14, marginTop: 8, marginBottom: 4,
      shadowColor: colors.forest, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12,
    },
    toggleLabelWrap: { flex: 1, paddingRight: 12 },
    toggleLabel: {
      fontFamily: fonts.display, fontSize: 15, color: colors.forest, fontWeight: '600',
    },
    toggleHint: {
      fontFamily: fonts.display, fontSize: 12, color: colors.mossFaint, marginTop: 2,
    },
    toggleDivider: { height: 1, backgroundColor: colors.line },

    // ── Add button ────────────────────────────────────────────────────────────
    addBtn: {
      width: '100%', backgroundColor: colors.forest,
      borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8,
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: {
      fontFamily: fonts.display, color: colors.cream, fontSize: 16, fontWeight: '600',
    },

    // ── Edit button (sits on the food tile, right side) ───────────────────────
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0,
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: colors.sageBg2,
    },
    editBtnText: {
      fontFamily: fonts.display, fontSize: 13, fontWeight: '700', color: colors.forest,
    },

    // ── Cancel ────────────────────────────────────────────────────────────────
    cancelBtn: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
    cancelText: {
      fontFamily: fonts.display, color: colors.moss, fontSize: 15,
    },

    // ── Unit picker ───────────────────────────────────────────────────────────
    unitRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8,
      marginBottom: 10, marginTop: 6,
    },
    unitPill: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
    },
    unitPillActive: { borderColor: colors.matcha, backgroundColor: colors.sageBg2 },
    unitPillText: { fontFamily: fonts.display, fontSize: 13, color: colors.moss },
    unitPillTextActive: { color: colors.matchaDeep, fontWeight: '700' as const },
  }), [colors])

  useEffect(() => {
    if (product) {
      const unknownWeight = product.packageWeightG <= 0
      const srvs = product.servings ?? []
      const initialWeightG = srvs.length > 0 ? srvs[0].weightG : (unknownWeight ? 0 : product.packageWeightG)
      setName(product.name)
      setWeight(initialWeightG > 0 ? String(initialWeightG) : '')
      setEmoji(product.emoji)
      setMacrosPer100g(product.macrosPer100g)
      setEditing(false)
      setKcalPer100g(product.kcalPer100g)
      setServings(srvs)
      setServingIdx(srvs.length > 0 ? 0 : null)
      setOriginal({ weightG: initialWeightG, kcalPer100g: product.kcalPer100g, macrosPer100g: product.macrosPer100g })
    } else {
      setName('')
      setWeight('')
      setKcalPer100g(null)
      setMacrosPer100g(undefined)
      setEmoji('🛒')
      setEditing(false)
      setServings([])
      setServingIdx(null)
      setOriginal(null)
    }
    setPickedSuggestion(false)
    setQty(1)
    setDropdownOpen(false)
    setSaveToFoods(true)
    setLinkedBarcode(null)
  }, [product, visible])

  // LayoutAnimation (native-driven, no height estimate needed) expands the nutrition card
  // and shifts everything below it in one smooth pass; the card itself fades in.
  function enterEdit() {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    )
    setEditing(true)
  }

  const { suggestions, loading } = useFoodSearch(isManual && dropdownOpen ? name : '', customFoods)

  function handleNameChange(text: string) {
    setName(text)
    setKcalPer100g(null)
    setMacrosPer100g(undefined)
    setEmoji('🛒')
    setPickedSuggestion(false)
    setDropdownOpen(true)
  }

  function pick(s: FoodSuggestion) {
    setName(s.name)
    setKcalPer100g(s.kcalPer100g)
    setEmoji(s.emoji)
    setMacrosPer100g(s.macrosPer100g)
    setPickedSuggestion(true)
    setEditing(false)
    const srvs = s.servings ?? []
    setServings(srvs)
    const initialWeightG = srvs.length > 0 ? srvs[0].weightG : (s.packageWeightG || 0)
    setWeight(initialWeightG > 0 ? String(initialWeightG) : '')
    setServingIdx(srvs.length > 0 ? 0 : null)
    setOriginal({ weightG: initialWeightG, kcalPer100g: s.kcalPer100g, macrosPer100g: s.macrosPer100g })
    setDropdownOpen(false)
    Keyboard.dismiss()
  }

  // Weight is always stored in grams internally; display/input convert to the user's preferred unit.
  const isOz = units.weight === 'oz'
  const weightLabel = isOz ? 'Weight per pack (oz)' : 'Weight per pack (g)'
  const weightPlaceholder = isOz ? '17.6' : '500'

  function weightToDisplay(gStr: string): string {
    if (!gStr) return ''
    const g = parseFloat(gStr)
    if (!Number.isFinite(g) || g === 0) return gStr
    return isOz ? (g / 28.3495).toFixed(1) : gStr
  }

  function displayToGrams(displayStr: string): string {
    if (!displayStr) return ''
    const v = parseFloat(displayStr)
    if (!Number.isFinite(v)) return ''
    return isOz ? String(Math.round(v * 28.3495)) : displayStr
  }

  const effectivePer100g = kcalPer100g
  const weightNum = parseFloat(weight) || 0
  const perUnitKcal = effectivePer100g != null ? kcalForWeight(effectivePer100g, weightNum) : 0
  // Guard against silently adding an empty/garbage item.
  const canAdd = weightNum > 0 && name.trim().length > 0
  const showEditButton = (scanned && !isManual && !editing) || (isManual && pickedSuggestion && !editing)
  // Only offer "add your own" once there's actually nothing to pick: search has settled
  // (not loading) with zero matches. While a match is still possible, only the dropdown
  // shows — no point racing custom-entry fields alongside a live search.
  const showCustomCard = isManual && !pickedSuggestion && name.trim().length > 0 && !loading && suggestions.length === 0
  // True once there's something to act on: a product/suggestion is chosen, an active scan
  // is in flight (found or not), or search has settled with no match and the custom-add
  // card is showing. While suggestions are still being browsed, these stay hidden — they
  // belong to a chosen/entered item, not to an in-progress search.
  const hasTypedOrChosen = !isManual || pickedSuggestion || scanned || showCustomCard
  const isDirty = original != null && (
    weightNum !== original.weightG ||
    kcalPer100g !== original.kcalPer100g ||
    !macrosEqual(macrosPer100g, original.macrosPer100g)
  )
  const showSaveToggle = original === null || isDirty
  // Current match in My Foods: prefer barcode (stable even if the name gets edited),
  // else fall back to a case-insensitive name match on what's currently typed/shown.
  const matchedFood = (scanBarcode && findCustomByBarcode(customFoods, scanBarcode))
    || findCustomByName(customFoods, name)
  const saveLabel = matchedFood ? `Update "${matchedFood.name}"` : 'Save to My Foods'
  // The barcode that will end up stored on the saved CustomFood: a real scan match takes
  // priority; otherwise whatever the user linked manually via "Link a barcode".
  const effectiveBarcode = scanBarcode ?? linkedBarcode

  async function handleLinkBarcode() {
    const code = await onScanForBarcode?.()
    if (code) setLinkedBarcode(code)
  }

  function handleAdd() {
    if (!canAdd) return
    onAdd({
      name: name.trim() || 'Item',
      weightG: weightNum,
      kcal: perUnitKcal,
      emoji,
      quantity: qty,
      source: product ? 'barcode' : 'manual',
      macrosPer100g,
    }, { save: showSaveToggle && saveToFoods, barcode: effectiveBarcode ?? undefined })
    Keyboard.dismiss()
    onClose()
  }

  // Show scan row only in manual mode (no scanned product)
  const showScanRow = isManual && (onScanBarcode != null || onScanReceipt != null)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => { if (isManual) nameInputRef.current?.focus() }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={[styles.backdrop, { justifyContent: 'flex-end' }]}>
              <View style={styles.sheet} testID="add-item-sheet">
                {/* Grab handle */}
                <View style={styles.grab} />

                <View>
                  {/* Sheet header */}
                  <Text style={styles.sheetTitle}>
                    {isManual ? 'Add to batch' : name}
                  </Text>
                  <Text style={styles.sheetDesc}>
                    {isManual
                      ? 'Scan, search a staple, or enter it yourself.'
                      : `${emoji}  ·  ${kcalPer100g != null ? `${kcalPer100g} kcal/100g` : 'Scanned item'}`}
                  </Text>

                  {/* ── 2. SEARCH BAR (manual mode) ── */}
                  {isManual && (
                    <View style={styles.searchBar}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        ref={nameInputRef}
                        testID="manual-name-input"
                        style={styles.searchInput}
                        placeholder="Search food or add your own…"
                        placeholderTextColor={colors.mossFaint}
                        value={name}
                        onChangeText={handleNameChange}
                        returnKeyType="done"
                        autoCorrect={false}
                      />
                      {name.length > 0 && (
                        <TouchableOpacity
                          style={styles.searchClear}
                          onPress={() => {
                            setName('')
                            setKcalPer100g(null)
                            setMacrosPer100g(undefined)
                            setEmoji('🛒')
                            setPickedSuggestion(false)
                            setDropdownOpen(false)
                          }}
                        >
                          <Text style={styles.searchClearText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* ── 3. SUGGESTION LIST ── */}
                  {isManual && dropdownOpen && (suggestions.length > 0 || loading) && (
                    <ScrollView
                      style={styles.suggestionList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {suggestions.length === 0 && loading && (
                        <Text style={styles.searching} testID="suggestions-loading">
                          Searching…
                        </Text>
                      )}
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={`${s.source}-${s.name}-${i}`}
                          testID="suggestion-row"
                          style={styles.suggestionCard}
                          onPress={() => pick(s)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.suggestionAv}>
                            <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                          </View>
                          <View style={styles.suggestionTx}>
                            <Text style={styles.suggestionName} numberOfLines={1}>{s.name}</Text>
                            <Text style={styles.suggestionMeta} numberOfLines={1}>
                              {s.packageWeightG
                                ? <><Text style={styles.suggestionMetaNum}>{s.packageWeightG}</Text>{' g · '}<Text style={styles.suggestionMetaNum}>{kcalForWeight(s.kcalPer100g, s.packageWeightG)}</Text>{' kcal'}</>
                                : <><Text style={styles.suggestionMetaNum}>{s.kcalPer100g}</Text>{' kcal/100g'}</>
                              }
                              {s.source === 'off' ? '  · OFF' : ''}
                            </Text>
                          </View>
                          <View style={styles.suggestionAdd}>
                            <PlusIcon size={18} color={colors.white} strokeWidth={2.6} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* ── 4. CUSTOM-ADD CARD (manual, search settled with no match) ── */}
                  {showCustomCard && (
                    <View style={styles.customCard}>
                      {/* Weight input inside custom card */}
                      <View style={styles.fieldRow}>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>{weightLabel}</Text>
                          <TextInput
                            testID="weight-input"
                            style={styles.fieldInput}
                            keyboardType="decimal-pad"
                            value={weightToDisplay(weight)}
                            onChangeText={(t) => setWeight(displayToGrams(t))}
                            returnKeyType="done"
                            placeholderTextColor={colors.mossFaint}
                            placeholder={weightPlaceholder}
                          />
                        </View>
                      </View>
                      <NutritionFields
                        basis={basis}
                        onBasisChange={onBasisChange}
                        G={weightNum * qty}
                        kcalPer100g={effectivePer100g}
                        macrosPer100g={macrosPer100g}
                        onChange={({ kcalPer100g, macrosPer100g }) => { setKcalPer100g(kcalPer100g); setMacrosPer100g(macrosPer100g) }}
                        editable={isManual || editing}
                      />
                    </View>
                  )}

                  {/* ── 5. FOOD TILE (scanned, or a picked suggestion) — name/kcal + Edit ── */}
                  {(!isManual || pickedSuggestion) && (
                    <View style={styles.productSummary}>
                      <View style={styles.productAv}>
                        <Text style={styles.productEmoji}>{emoji}</Text>
                      </View>
                      <View style={styles.productTx}>
                        <Text style={styles.productName}>{name}</Text>
                        {kcalPer100g != null && (
                          <Text style={styles.productMeta}>{kcalPer100g} kcal/100g</Text>
                        )}
                      </View>
                      {showEditButton ? (
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={enterEdit}
                          testID="edit-product-button"
                          accessibilityLabel="Edit item"
                        >
                          <EditIcon size={13} color={colors.forest} />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                      ) : perUnitKcal > 0 ? (
                        <View>
                          <Text style={styles.productKcal}>
                            {formatEnergy(perUnitKcal, units)}
                          </Text>
                          <Text style={styles.productKcalSmall}>KCAL</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* ── NUTRITION (manual after a pick, or found scan — both once editing) ──
                       Expands in via the LayoutAnimation configured in enterEdit. Rendered right
                       after the tile (before pack size/name) so the tuck-under seam lands on the
                       tile's rounded bottom edge, not on whatever editable field happens to sit
                       below. ── */}
                  {editing && (isManual ? pickedSuggestion : true) && (
                    <View style={styles.nutritionCard}>
                      <NutritionFields
                        basis={basis}
                        onBasisChange={onBasisChange}
                        G={weightNum * qty}
                        kcalPer100g={effectivePer100g}
                        macrosPer100g={macrosPer100g}
                        onChange={({ kcalPer100g, macrosPer100g }) => { setKcalPer100g(kcalPer100g); setMacrosPer100g(macrosPer100g) }}
                        editable={isManual || editing}
                      />
                    </View>
                  )}

                  {/* ── 5a. PACK SIZE — always visible and editable once a food is chosen; never
                       gated behind Edit, since "how much did I actually buy" isn't a macro edit.
                       Rendered below the nutrition reveal (rather than between tile and reveal) so
                       it stays its own separate box, not part of the tile/nutrition seam. ── */}
                  {(!isManual || pickedSuggestion) && (
                    <View style={styles.packSizeWrap}>
                      {servings.length > 0 && (
                        <View style={styles.unitRow}>
                          {servings.map((s, i) => (
                            <TouchableOpacity
                              key={i}
                              style={[styles.unitPill, servingIdx === i && styles.unitPillActive]}
                              onPress={() => { setServingIdx(i); setWeight(String(s.weightG)) }}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.unitPillText, servingIdx === i && styles.unitPillTextActive]}>
                                {s.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={[styles.unitPill, servingIdx === null && styles.unitPillActive]}
                            onPress={() => setServingIdx(null)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.unitPillText, servingIdx === null && styles.unitPillTextActive]}>
                              Custom ({isOz ? 'oz' : 'g'})
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {servingIdx === null && (
                        <>
                          <Text style={styles.sectionLabel}>{weightLabel}</Text>
                          <TextInput
                            testID="weight-input"
                            style={styles.weightInput}
                            keyboardType="decimal-pad"
                            value={weightToDisplay(weight)}
                            onChangeText={(t) => setWeight(displayToGrams(t))}
                            returnKeyType="done"
                            placeholderTextColor={colors.mossFaint}
                            placeholder={weightPlaceholder}
                          />
                        </>
                      )}
                    </View>
                  )}

                  {/* ── 5b. EDIT FORM — Name (found scan, after tapping Edit) ── */}
                  {!isManual && editing && (
                    <>
                      <Text style={styles.sectionLabel}>Name</Text>
                      <TextInput
                        testID="edit-name-input"
                        style={styles.weightInput}
                        value={name}
                        onChangeText={setName}
                        returnKeyType="done"
                        placeholderTextColor={colors.mossFaint}
                      />
                    </>
                  )}
                </View>

                {hasTypedOrChosen && (
                  <>
                    {/* ── QUANTITY ── */}
                    <View style={styles.qtyRow}>
                      <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Quantity</Text>
                      <Stepper value={qty} min={1} max={99} onChange={setQty} testID="qty" />
                    </View>

                    {/* ── TOGGLES (Save to My Foods only for new/edited items; Keep scanning on scan-opened sheets) ── */}
                    {(showSaveToggle || isManual || scanned) && (
                      <View style={styles.toggleGroup}>
                        {showSaveToggle && (
                          <View style={styles.toggleRow}>
                            <View style={styles.toggleLabelWrap}>
                              <Text style={styles.toggleLabel}>{saveLabel}</Text>
                              <Text style={styles.toggleHint}>
                                {matchedFood ? 'Refresh the saved details with what you entered' : 'Preload it next time you add this item'}
                              </Text>
                            </View>
                            <Toggle
                              value={saveToFoods}
                              onValueChange={setSaveToFoods}
                              testID="toggle-save-to-foods"
                            />
                          </View>
                        )}
                        {isManual && (
                          <>
                            {showSaveToggle && <View style={styles.toggleDivider} />}
                            {effectiveBarcode ? (
                              <View style={styles.toggleRow}>
                                <View style={styles.toggleLabelWrap}>
                                  <Text style={styles.toggleLabel}>Barcode linked ✓</Text>
                                  <Text style={styles.toggleHint}>Next scan of this item will find it</Text>
                                </View>
                              </View>
                            ) : (
                              <TouchableOpacity
                                testID="link-barcode-button"
                                style={styles.toggleRow}
                                onPress={handleLinkBarcode}
                                accessibilityLabel="Link a barcode"
                              >
                                <View style={styles.toggleLabelWrap}>
                                  <Text style={styles.toggleLabel}>Link a barcode</Text>
                                  <Text style={styles.toggleHint}>Scan the pack so this item is found next time</Text>
                                </View>
                                <BarcodeIcon size={20} color={colors.forest} />
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                        {scanned && (
                          <>
                            {(showSaveToggle || isManual) && <View style={styles.toggleDivider} />}
                            <View style={styles.toggleRow}>
                              <View style={styles.toggleLabelWrap}>
                                <Text style={styles.toggleLabel}>Keep scanning</Text>
                                <Text style={styles.toggleHint}>Reopen the scanner after you add</Text>
                              </View>
                              <Toggle
                                value={keepScanning}
                                onValueChange={onKeepScanning ?? (() => {})}
                                testID="toggle-keep-scanning"
                              />
                            </View>
                          </>
                        )}
                      </View>
                    )}

                    {/* ── ADD BUTTON ── */}
                    <TouchableOpacity
                      testID="add-item-button"
                      style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                      onPress={handleAdd}
                      disabled={!canAdd}
                    >
                      <Text style={styles.addBtnText}>
                        Add to period{perUnitKcal > 0 ? ` · ${formatEnergy(perUnitKcal * qty, units)}` : ''}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* ── CANCEL ── */}
                <TouchableOpacity testID="cancel-button" style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>
    </Modal>
  )
}
