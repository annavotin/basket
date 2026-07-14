import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { ReceiptLine, FoodItem, Macros, NutritionBasis } from '../types'
import { lineToFoodItem } from '../utils/receipt'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import ItemDetail from './ItemDetail'

type Props = {
  visible: boolean
  lines: ReceiptLine[]
  days: number
  onConfirm: (items: FoodItem[]) => void
  onClose: () => void
}

// weightG/kcal are per-unit with quantity as a separate multiplier, mirroring FoodItem,
// so a row maps 1:1 onto the draft item handed to ItemDetail.
type Row = {
  id: string
  name: string
  weightG: number
  kcal: number
  quantity: number
  macrosPer100g?: Macros
  included: boolean
}

function toRows(lines: ReceiptLine[]): Row[] {
  return lines.map((l) => ({
    id: l.id,
    name: l.name,
    weightG: l.weightG,
    kcal: l.kcal,
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
    addBtn: {
      backgroundColor: colors.selectedDay,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
    cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    cancelText: { color: colors.monthText, fontSize: 15 },
  }), [colors])

  useEffect(() => {
    setRows(toRows(lines))
    setDetailId(null)
  }, [lines, visible])

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  // ItemDetail's saveItem always sets name/weightG/kcal/quantity/macrosPer100g on the patch;
  // an undefined macrosPer100g means the user cleared the macros, so it's applied as-is.
  function handleSaveDetail(patch: Partial<FoodItem>) {
    if (detailId == null) return
    update(detailId, {
      ...(patch.name != null ? { name: patch.name } : {}),
      ...(patch.weightG != null ? { weightG: patch.weightG } : {}),
      ...(patch.kcal != null ? { kcal: patch.kcal } : {}),
      ...(patch.quantity != null ? { quantity: patch.quantity } : {}),
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
          { id: r.id, name: r.name.trim() || 'Item', weightG: r.weightG, kcal: r.kcal, isFood: true },
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
        weightG: detailRow.weightG,
        kcal: detailRow.kcal,
        emoji: '🛒',
        quantity: detailRow.quantity,
        source: 'receipt',
        macrosPer100g: detailRow.macrosPer100g,
      }
    : null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="receipt-review-sheet">
          <Text style={styles.title}>Review receipt</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
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
                    {r.quantity > 1 ? `${r.quantity} × ` : ''}{r.weightG.toLocaleString()} g · {(r.kcal * r.quantity).toLocaleString()} kcal
                  </Text>
                </TouchableOpacity>
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
