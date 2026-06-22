import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import Stepper from './settings/Stepper'
import Toggle from './settings/Toggle'
import { BarcodeIcon, ReceiptIcon, EditIcon } from './icons'
import { Product } from '../mockProducts'
import { FoodItem, Macros, CustomFood } from '../types'
import { kcalForWeight } from '../utils/nutrition'
import { useFoodSearch } from '../hooks/useFoodSearch'
import { FoodSuggestion } from '../foods'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'

type Props = {
  visible: boolean
  product: Product | null
  onAdd: (item: FoodItem) => void
  onClose: () => void
  onScanBarcode?: () => void
  onScanReceipt?: () => void
  customFoods?: CustomFood[]
  scanned?: boolean
  saveForLater?: boolean
  onSaveForLater?: (next: boolean) => void
  keepScanning?: boolean
  onKeepScanning?: (next: boolean) => void
}

export default function AddItemSheet({ visible, product, onAdd, onClose, onScanBarcode, onScanReceipt, customFoods = [], scanned = false, saveForLater = true, onSaveForLater, keepScanning = false, onKeepScanning }: Props) {
  const colors = useColors()
  const units = useUnits()
  const isManual = product === null
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [qty, setQty] = useState(1)
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>(undefined)
  const [manualKcal100, setManualKcal100] = useState('')
  const [emoji, setEmoji] = useState('🛒')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  // Found scans open as a read-only summary; tapping Edit reveals the fields (and Remember).
  const [editing, setEditing] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.cream,
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      padding: 10, paddingHorizontal: 22, paddingBottom: 30,
      maxHeight: '90%',
    },
    grab: {
      width: 40, height: 5, borderRadius: 3, backgroundColor: colors.sage100,
      alignSelf: 'center', marginTop: 6, marginBottom: 16,
    },
    sheetTitle: {
      fontFamily: fonts.head,
      fontSize: 21, color: colors.forest, marginBottom: 2,
    },
    sheetDesc: {
      fontFamily: fonts.display,
      fontSize: 13, color: colors.moss, marginBottom: 16,
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
      marginBottom: 12, height: 48,
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
    suggestionAddText: { fontSize: 18, color: colors.white, lineHeight: 20 },
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
      padding: 14, marginBottom: 14,
      shadowColor: colors.forest, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
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

    // ── Kcal preview ──────────────────────────────────────────────────────────
    kcalPreview: {
      fontFamily: fonts.display, fontSize: 14, color: colors.matchaDeep,
      fontWeight: '600', textAlign: 'center', marginVertical: 6,
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

    // ── Edit button (top-right of a found scan) ───────────────────────────────
    editBtn: {
      position: 'absolute', top: 12, right: 14, zIndex: 2,
      flexDirection: 'row', alignItems: 'center', gap: 5,
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
  }), [colors])

  useEffect(() => {
    if (product) {
      const unknownWeight = product.packageWeightG <= 0
      setName(product.name)
      setWeight(unknownWeight ? '' : String(product.packageWeightG))
      setEmoji(product.emoji)
      setMacrosPer100g(product.macrosPer100g)
      // Prefill the editable calories string from the DB value (shown once Edit is tapped).
      setManualKcal100(String(product.kcalPer100g))
      // Unknown pack weight can't be added as-is (needs weight > 0) → open straight into edit.
      setEditing(unknownWeight)
      // While not editing, the numeric kcal drives the read-only summary; in edit mode it's
      // null so the editable `manualKcal100` string takes over (see effectivePer100g).
      setKcalPer100g(unknownWeight ? null : product.kcalPer100g)
    } else {
      setName('')
      setWeight('')
      setKcalPer100g(null)
      setMacrosPer100g(undefined)
      setEmoji('🛒')
      setManualKcal100('')
      setEditing(false)
    }
    setQty(1)
    setDropdownOpen(false)
  }, [product, visible])

  function enterEdit() {
    if (kcalPer100g != null) {
      setManualKcal100(String(kcalPer100g))
      setKcalPer100g(null) // hand the value to the editable string field
    }
    setEditing(true)
    onSaveForLater?.(true) // editing implies you want to remember the correction
  }

  const { suggestions, loading } = useFoodSearch(isManual && dropdownOpen ? name : '', customFoods)

  function handleNameChange(text: string) {
    setName(text)
    setKcalPer100g(null)
    setEmoji('🛒')
    setDropdownOpen(true)
  }

  function pick(s: FoodSuggestion) {
    setName(s.name)
    setKcalPer100g(s.kcalPer100g)
    setEmoji(s.emoji)
    setMacrosPer100g(s.macrosPer100g)
    if (s.packageWeightG) setWeight(String(s.packageWeightG))
    setDropdownOpen(false)
    Keyboard.dismiss()
  }

  const effectivePer100g =
    kcalPer100g ?? (parseFloat(manualKcal100) > 0 ? parseFloat(manualKcal100) : null)
  const weightNum = parseInt(weight, 10) || 0
  const perUnitKcal = effectivePer100g != null ? kcalForWeight(effectivePer100g, weightNum) : 0
  const showManualPer100 = isManual && kcalPer100g == null
  // Guard against silently adding an empty/garbage item.
  const canAdd = weightNum > 0 && name.trim().length > 0
  // "Remember" only makes sense once you've changed the DB data: shown when typing a
  // not-found item (isManual) or after tapping Edit on a found one. The Edit button is the
  // entry point for the found case. "Keep scanning" shows on any scan-opened sheet.
  const showRemember = scanned && (isManual || editing)
  const showEditButton = scanned && !isManual && !editing

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
    })
    Keyboard.dismiss()
    onClose()
  }

  // Show scan row only in manual mode (no scanned product)
  const showScanRow = isManual && (onScanBarcode != null || onScanReceipt != null)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={styles.backdrop}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.sheet} testID="add-item-sheet">
                {/* Grab handle */}
                <View style={styles.grab} />

                {/* Edit affordance for a found scan (read-only summary by default) */}
                {showEditButton && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={enterEdit}
                    testID="edit-product-button"
                    accessibilityLabel="Edit item"
                  >
                    <EditIcon size={13} color={colors.forest} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}

                {/* Sheet header */}
                <Text style={styles.sheetTitle}>
                  {isManual ? 'Add to basket' : name}
                </Text>
                <Text style={styles.sheetDesc}>
                  {isManual
                    ? 'Scan, search a staple, or enter it yourself.'
                    : `${emoji}  ·  ${kcalPer100g != null ? `${kcalPer100g} kcal/100g` : 'Scanned item'}`}
                </Text>

                {/* ── 1. SCAN ROW (manual mode only, when callbacks provided) ── */}
                {showScanRow && (
                  <View style={styles.scanRow}>
                    <TouchableOpacity
                      style={styles.scanBtn}
                      onPress={() => { onClose(); onScanBarcode?.() }}
                      accessibilityLabel="Scan barcode"
                    >
                      <BarcodeIcon size={17} color={colors.white} />
                      <Text style={styles.scanBtnText}>Scan barcode</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.scanBtn, styles.scanBtnReceipt]}
                      onPress={() => { onClose(); onScanReceipt?.() }}
                      accessibilityLabel="Scan receipt"
                    >
                      <ReceiptIcon size={17} color={colors.white} />
                      <Text style={styles.scanBtnText}>Scan receipt</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── 2. SEARCH BAR (manual mode) ── */}
                {isManual && (
                  <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
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
                          setEmoji('🛒')
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
                          <Text style={styles.suggestionAddText}>+</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* ── 4. CUSTOM-ADD CARD (manual, no suggestion picked) ── */}
                {isManual && kcalPer100g == null && (
                  <View style={styles.customCard}>
                    <View style={styles.customCardHeader}>
                      <View style={styles.customCardAv}>
                        <Text style={styles.customCardEmoji}>{emoji}</Text>
                      </View>
                      <Text style={styles.customCardName} numberOfLines={1}>
                        {name.trim() ? `Add "${name.trim()}"` : 'Enter details below'}
                      </Text>
                    </View>

                    {/* Weight input inside custom card */}
                    <View style={styles.fieldRow}>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Weight (g)</Text>
                        <TextInput
                          testID="weight-input"
                          style={styles.fieldInput}
                          keyboardType="numeric"
                          value={weight}
                          onChangeText={setWeight}
                          returnKeyType="done"
                          placeholderTextColor={colors.mossFaint}
                          placeholder="500"
                        />
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Calories (per 100g)</Text>
                        <TextInput
                          testID="kcal-per-100g-input"
                          style={styles.fieldInput}
                          keyboardType="numeric"
                          value={manualKcal100}
                          onChangeText={setManualKcal100}
                          returnKeyType="done"
                          placeholderTextColor={colors.mossFaint}
                          placeholder="320"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* ── 5. SCANNED PRODUCT SUMMARY (read-only default view) ── */}
                {!isManual && !editing && (
                  <View style={styles.productSummary}>
                    <View style={styles.productAv}>
                      <Text style={styles.productEmoji}>{emoji}</Text>
                    </View>
                    <View style={styles.productTx}>
                      <Text style={styles.productName}>{name}</Text>
                      {kcalPer100g != null && (
                        <Text style={styles.productMeta}>{kcalPer100g} kcal / 100g</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.productKcal}>
                        {perUnitKcal > 0 ? formatEnergy(perUnitKcal, units) : '—'}
                      </Text>
                      <Text style={styles.productKcalSmall}>KCAL</Text>
                    </View>
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

                {/* ── WEIGHT input (manual after a pick, or a found scan in edit mode) ── */}
                {((isManual && kcalPer100g != null) || (!isManual && editing)) && (
                  <>
                    <Text style={styles.sectionLabel}>Weight (g)</Text>
                    <TextInput
                      testID="weight-input"
                      style={styles.weightInput}
                      keyboardType="numeric"
                      value={weight}
                      onChangeText={setWeight}
                      returnKeyType="done"
                      placeholderTextColor={colors.mossFaint}
                    />
                  </>
                )}

                {/* ── CALORIES input (found scan in edit mode) ── */}
                {!isManual && editing && (
                  <>
                    <Text style={styles.sectionLabel}>Calories (per 100g)</Text>
                    <TextInput
                      testID="kcal-per-100g-input"
                      style={styles.weightInput}
                      keyboardType="numeric"
                      value={manualKcal100}
                      onChangeText={setManualKcal100}
                      returnKeyType="done"
                      placeholderTextColor={colors.mossFaint}
                    />
                  </>
                )}

                {/* ── QUANTITY ── */}
                <View style={styles.qtyRow}>
                  <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Quantity</Text>
                  <Stepper value={qty} min={1} max={99} onChange={setQty} testID="qty" />
                </View>

                {/* ── KCAL PREVIEW (only once there's something to total) ── */}
                {perUnitKcal > 0 && (
                  <Text style={styles.kcalPreview} testID="kcal-preview">
                    {qty > 1
                      ? `${formatEnergy(perUnitKcal, units)} × ${qty} = ${formatEnergy(perUnitKcal * qty, units)}`
                      : formatEnergy(perUnitKcal, units)}
                  </Text>
                )}

                {/* ── SCAN TOGGLES (scan-opened sheets only) ── */}
                {scanned && (
                  <View style={styles.toggleGroup}>
                    {showRemember && (
                      <>
                        <View style={styles.toggleRow}>
                          <View style={styles.toggleLabelWrap}>
                            <Text style={styles.toggleLabel}>Remember this item</Text>
                            <Text style={styles.toggleHint}>Preload it next time you scan this barcode</Text>
                          </View>
                          <Toggle
                            value={saveForLater}
                            onValueChange={onSaveForLater ?? (() => {})}
                            testID="toggle-remember"
                          />
                        </View>
                        <View style={styles.toggleDivider} />
                      </>
                    )}
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
                  </View>
                )}

                {/* ── ADD BUTTON ── */}
                <TouchableOpacity
                  testID="add-item-button"
                  style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                  onPress={handleAdd}
                  disabled={!canAdd}
                >
                  <Text style={styles.addBtnText}>Add to period</Text>
                </TouchableOpacity>

                {/* ── CANCEL ── */}
                <TouchableOpacity testID="cancel-button" style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>
    </Modal>
  )
}
