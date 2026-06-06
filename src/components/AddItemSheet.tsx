import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { Product } from '../mockProducts'
import { FoodItem } from '../types'
import { kcalForWeight } from '../utils/nutrition'
import { useFoodSearch } from '../hooks/useFoodSearch'
import { FoodSuggestion } from '../foods'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  product: Product | null
  onAdd: (item: FoodItem) => void
  onClose: () => void
}

export default function AddItemSheet({ visible, product, onAdd, onClose }: Props) {
  const isManual = product === null
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [qty, setQty] = useState(1)
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [manualKcal100, setManualKcal100] = useState('')
  const [emoji, setEmoji] = useState('🛒')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setWeight(String(product.packageWeightG))
      setKcalPer100g(product.kcalPer100g)
      setEmoji(product.emoji)
    } else {
      setName('')
      setWeight('')
      setKcalPer100g(null)
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
    })
    Keyboard.dismiss()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="add-item-sheet">
              <Text style={styles.title}>{isManual ? 'Add item' : name}</Text>
              {!isManual && <Text style={styles.emoji}>{emoji}</Text>}

              {isManual && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    testID="manual-name-input"
                    style={styles.input}
                    placeholder="Search food (e.g. banana)"
                    value={name}
                    onChangeText={handleNameChange}
                    returnKeyType="done"
                  />
                  {dropdownOpen && (suggestions.length > 0 || loading) && (
                    <ScrollView
                      style={styles.dropdown}
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
                          style={styles.suggestion}
                          onPress={() => pick(s)}
                        >
                          <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                          <Text style={styles.suggestionName}>{s.name}</Text>
                          <Text style={styles.suggestionKcal}>
                            {s.kcalPer100g} kcal/100g{s.source === 'off' ? '  · OFF' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              <Text style={styles.fieldLabel}>Weight (g)</Text>
              <TextInput
                testID="weight-input"
                style={styles.input}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                returnKeyType="done"
              />

              {showManualPer100 && (
                <>
                  <Text style={styles.fieldLabel}>Calories (per 100g)</Text>
                  <TextInput
                    testID="kcal-per-100g-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={manualKcal100}
                    onChangeText={setManualKcal100}
                    returnKeyType="done"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Quantity</Text>
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
                  onPress={() => setQty((q) => q + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.summary} testID="kcal-preview">
                {qty > 1
                  ? `${perUnitKcal} kcal × ${qty} = ${perUnitKcal * qty} kcal`
                  : `${perUnitKcal} kcal`}
              </Text>

              <TouchableOpacity
                testID="add-item-button"
                style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!canAdd}
              >
                <Text style={styles.addBtnText}>Add to period</Text>
              </TouchableOpacity>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.kcalText },
  emoji: { fontSize: 44, marginVertical: 8 },
  summary: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginTop: 12 },
  fieldBlock: { width: '100%' },
  fieldLabel: {
    alignSelf: 'flex-start', fontSize: 13, color: colors.monthText, marginTop: 12, marginBottom: 4,
  },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  dropdown: {
    width: '100%', maxHeight: 180, borderWidth: 1, borderColor: '#EEEEEE',
    borderRadius: 10, marginTop: 4,
  },
  suggestion: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  suggestionEmoji: { fontSize: 20, marginRight: 10 },
  suggestionName: { flex: 1, fontSize: 15, color: colors.kcalText },
  suggestionKcal: { fontSize: 12, color: colors.monthText },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.itemCard,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 24, fontWeight: '600', color: colors.kcalText },
  qtyValue: { fontSize: 18, fontWeight: '700', color: colors.kcalText, marginHorizontal: 20, minWidth: 24, textAlign: 'center' },
  addBtn: {
    width: '100%', backgroundColor: colors.selectedDay, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
  searching: { padding: 12, fontSize: 14, color: colors.monthText },
  cancelBtn: { paddingVertical: 12, marginTop: 4 },
  cancelText: { color: colors.monthText, fontSize: 15 },
})
