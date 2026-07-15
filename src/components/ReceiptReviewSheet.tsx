import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { ReceiptLine, FoodItem, Macros, NutritionBasis } from '../types'
import { lineToFoodItem } from '../utils/receipt'
import { kcalForWeight, roundTenth } from '../utils/nutrition'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import DismissArea from './DismissArea'
import ItemDetail from './ItemDetail'

type Props = {
  visible: boolean
  lines: ReceiptLine[]
  days: number
  onConfirm: (items: FoodItem[]) => void
  onClose: () => void
}

// weight/kcal are per-unit with quantity as a separate multiplier, mirroring FoodItem,
// so a row maps 1:1 onto the draft item handed to ItemDetail. Receipts rarely print pack
// sizes, so weight is editable right on the row (as a string, mid-typing states included);
// kcalPer100g holds the scanned density so inline weight edits rescale kcal instead of
// silently keeping a total that belonged to the old weight.
type Row = {
  id: string
  name: string
  weight: string
  kcal: number
  kcalPer100g: number | null
  quantity: number
  macrosPer100g?: Macros
  included: boolean
}

function toRows(lines: ReceiptLine[]): Row[] {
  return lines.map((l) => ({
    id: l.id,
    name: l.name,
    weight: String(l.weightG),
    kcal: l.kcal,
    kcalPer100g: l.weightG > 0 ? roundTenth((l.kcal / l.weightG) * 100) : null,
    quantity: 1,
    included: l.isFood,
  }))
}

export default function ReceiptReviewSheet({ visible, lines, days, onConfirm, onClose }: Props) {
  const colors = useColors()
  const [rows, setRows] = useState<Row[]>(() => toRows(lines))
  const [detailId, setDetailId] = useState<string | null>(null)
  // Receipt lines carry total kcal for the line's weight, so the detail sheet opens in
  // 'total' basis (the number the scanner actually produced).
  const [basis, setBasis] = useState<NutritionBasis>('total')

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, marginBottom: 12 },
    list: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.itemCard,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      shadowColor: colors.kcalText,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    check: {
      width: 26,
      height: 26,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cycleBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkOn: { backgroundColor: colors.cycleBar, borderColor: colors.cycleBar },
    checkMark: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    fields: { flex: 1 },
    name: { fontFamily: fonts.bodySemi, fontSize: 15, fontWeight: '600', color: colors.kcalText },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.monthText, marginTop: 2 },
    weightWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
    weightInput: {
      fontFamily: fonts.num, fontSize: 15, color: colors.kcalText, textAlign: 'right', minWidth: 56,
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    },
    weightUnit: { fontFamily: fonts.body, fontSize: 13, color: colors.monthText, marginLeft: 4 },
    addBtn: {
      backgroundColor: colors.selectedDay,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
    // alignSelf keeps the tap target hugging the label; a full-width touchable here eats
    // taps meant to dismiss the keyboard next to it and closes the whole sheet.
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'center', marginTop: 4 },
    cancelText: { color: colors.monthText, fontSize: 15 },
  }), [colors])

  useEffect(() => {
    setRows(toRows(lines))
    setDetailId(null)
  }, [lines, visible])

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function handleWeight(id: string, text: string) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const w = parseFloat(text) || 0
      return { ...r, weight: text, kcal: r.kcalPer100g != null ? kcalForWeight(r.kcalPer100g, w) : r.kcal }
    }))
  }

  // ItemDetail's saveItem always sets name/weightG/kcal/quantity/macrosPer100g on the patch;
  // an undefined macrosPer100g means the user cleared the macros, so it's applied as-is.
  function handleSaveDetail(patch: Partial<FoodItem>) {
    if (detailId == null) return
    update(detailId, {
      ...(patch.name != null ? { name: patch.name } : {}),
      ...(patch.weightG != null ? { weight: String(patch.weightG) } : {}),
      ...(patch.kcal != null ? { kcal: patch.kcal } : {}),
      ...(patch.quantity != null ? { quantity: patch.quantity } : {}),
      ...(patch.weightG != null && patch.kcal != null
        ? { kcalPer100g: patch.weightG > 0 ? roundTenth((patch.kcal / patch.weightG) * 100) : null }
        : {}),
      macrosPer100g: patch.macrosPer100g,
    })
  }

  function handleRemoveDetail() {
    if (detailId != null) update(detailId, { included: false })
    setDetailId(null)
  }

  function handleConfirm() {
    const items = rows
      .filter((r) => r.included)
      .map((r) =>
        lineToFoodItem(
          { id: r.id, name: r.name.trim() || 'Item', weightG: parseFloat(r.weight) || 0, kcal: r.kcal, isFood: true },
          r.macrosPer100g,
          r.quantity
        )
      )
    onConfirm(items)
    onClose()
  }

  const includedCount = rows.filter((r) => r.included).length
  const detailRow = rows.find((r) => r.id === detailId) ?? null
  const detailItem: FoodItem | null = detailRow
    ? {
        name: detailRow.name,
        weightG: parseFloat(detailRow.weight) || 0,
        kcal: detailRow.kcal,
        emoji: '🛒',
        quantity: detailRow.quantity,
        source: 'receipt',
        macrosPer100g: detailRow.macrosPer100g,
      }
    : null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="receipt-review-sheet">
              <Text style={styles.title}>Review receipt</Text>
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {rows.map((r) => (
                  <View key={r.id} testID={`receipt-row-${r.id}`} style={styles.row}>
                    <TouchableOpacity
                      testID={`toggle-${r.id}`}
                      style={[styles.check, r.included && styles.checkOn]}
                      onPress={() => update(r.id, { included: !r.included })}
                    >
                      <Text style={styles.checkMark}>{r.included ? '✓' : ''}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`open-${r.id}`}
                      style={styles.fields}
                      onPress={() => setDetailId(r.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.name}>{r.name}</Text>
                      <Text style={styles.meta}>
                        {r.quantity > 1 ? `${r.quantity} × ` : ''}{r.kcal.toLocaleString()} kcal
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.weightWrap}>
                      <TextInput
                        testID={`weight-${r.id}`}
                        style={styles.weightInput}
                        keyboardType="decimal-pad"
                        value={r.weight}
                        onChangeText={(t) => handleWeight(r.id, t)}
                        selectTextOnFocus
                      />
                      <Text style={styles.weightUnit}>g</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity testID="confirm-receipt" style={styles.addBtn} onPress={handleConfirm}>
                <Text style={styles.addBtnText}>
                  Add {includedCount} item{includedCount === 1 ? '' : 's'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-receipt" style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>

      {/* Inside this Modal on purpose: a sibling Modal visible at the same time is the
          iOS "already presenting" black-screen bug (see commit 0151b79). */}
      {detailItem && (
        <ItemDetail
          visible
          kind="item"
          item={detailItem}
          days={days}
          basis={basis}
          onBasisChange={setBasis}
          onSaveItem={handleSaveDetail}
          onRemove={handleRemoveDetail}
          onClose={() => setDetailId(null)}
        />
      )}
    </Modal>
  )
}
