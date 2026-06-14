import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { Product } from '../mockProducts'
import { FoodItem, Macros } from '../types'
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
}

export default function AddItemSheet({ visible, product, onAdd, onClose, onScanBarcode, onScanReceipt }: Props) {
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

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(30,41,20,0.42)', justifyContent: 'flex-end' },
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
      fontFamily: fonts.display,
      fontSize: 15, color: colors.forest,
    },
    suggestionMeta: {
      fontFamily: fonts.display,
      fontSize: 12, color: colors.mossFaint, marginTop: 1,
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

    // ── Qty stepper ───────────────────────────────────────────────────────────
    qtyRow: {
      flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6,
    },
    qtyBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sage100,
      alignItems: 'center', justifyContent: 'center',
    },
    qtyBtnText: { fontSize: 22, fontWeight: '600', color: colors.forest },
    qtyValue: {
      fontFamily: fonts.display, fontSize: 18, fontWeight: '700', color: colors.forest,
      marginHorizontal: 20, minWidth: 24, textAlign: 'center',
    },

    // ── Kcal preview ──────────────────────────────────────────────────────────
    kcalPreview: {
      fontFamily: fonts.display, fontSize: 14, color: colors.matchaDeep,
      fontWeight: '600', textAlign: 'center', marginVertical: 6,
    },

    // ── Add button ────────────────────────────────────────────────────────────
    addBtn: {
      width: '100%', backgroundColor: colors.forest,
      borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8,
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: {
      fontFamily: fonts.display, color: colors.cream, fontSize: 16, fontWeight: '600',
    },

    // ── Cancel ────────────────────────────────────────────────────────────────
    cancelBtn: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
    cancelText: {
      fontFamily: fonts.display, color: colors.moss, fontSize: 15,
    },
  }), [colors])

  useEffect(() => {
    if (product) {
      setName(product.name)
      setWeight(String(product.packageWeightG))
      setKcalPer100g(product.kcalPer100g)
      setEmoji(product.emoji)
      setMacrosPer100g(product.macrosPer100g)
    } else {
      setName('')
      setWeight('')
      setKcalPer100g(null)
      setMacrosPer100g(undefined)
      setEmoji('🛒')
    }
    setQty(1)
    setManualKcal100('')
    setDropdownOpen(false)
  }, [product, visible])

  const { suggestions, loading } = useFoodSearch(isManual && dropdownOpen ? name : '')

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
                      <Text>📷</Text>
                      <Text style={styles.scanBtnText}>Scan barcode</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.scanBtn, styles.scanBtnReceipt]}
                      onPress={() => { onClose(); onScanReceipt?.() }}
                      accessibilityLabel="Scan receipt"
                    >
                      <Text>🧾</Text>
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
                          <Text style={styles.suggestionName}>{s.name}</Text>
                          <Text style={styles.suggestionMeta}>
                            {s.kcalPer100g} kcal/100g{s.source === 'off' ? '  · OFF' : ''}
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

                {/* ── 5. SCANNED PRODUCT SUMMARY ── */}
                {!isManual && (
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

                {/* ── WEIGHT input (non-manual, or after a suggestion is picked) ── */}
                {(!isManual || (isManual && kcalPer100g != null)) && (
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

                {/* ── QUANTITY STEPPER ── */}
                <Text style={styles.sectionLabel}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    testID="qty-decrement"
                    style={styles.qtyBtn}
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text testID="qty-value" style={styles.qtyValue}>{qty}</Text>
                  <TouchableOpacity
                    testID="qty-increment"
                    style={styles.qtyBtn}
                    onPress={() => setQty((q) => Math.min(99, q + 1))}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* ── KCAL PREVIEW ── */}
                <Text style={styles.kcalPreview} testID="kcal-preview">
                  {perUnitKcal > 0
                    ? qty > 1
                      ? `${formatEnergy(perUnitKcal, units)} × ${qty} = ${formatEnergy(perUnitKcal * qty, units)}`
                      : formatEnergy(perUnitKcal, units)
                    : 'Enter weight & calories'}
                </Text>

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
