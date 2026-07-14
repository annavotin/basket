import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { ReceiptLine, FoodItem, Macros } from '../types'
import { lineToFoodItem } from '../utils/receipt'
import { kcalForWeight, roundTenth } from '../utils/nutrition'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import ReceiptLineDetail, { ReceiptLineDraft } from './ReceiptLineDetail'

type Props = {
  visible: boolean
  lines: ReceiptLine[]
  onConfirm: (items: FoodItem[]) => void
  onClose: () => void
}

type Row = {
  id: string
  name: string
  weightG: number
  kcal: number
  kcalPer100g: number | null
  macrosPer100g?: Macros
  included: boolean
}

function toRows(lines: ReceiptLine[]): Row[] {
  return lines.map((l) => ({
    id: l.id,
    name: l.name,
    weightG: l.weightG,
    kcal: l.kcal,
    kcalPer100g: l.weightG > 0 ? roundTenth((l.kcal / l.weightG) * 100) : null,
    included: l.isFood,
  }))
}

export default function ReceiptReviewSheet({ visible, lines, onConfirm, onClose }: Props) {
  const colors = useColors()
  const [rows, setRows] = useState<Row[]>(() => toRows(lines))
  const [detailId, setDetailId] = useState<string | null>(null)

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
  }, [lines, visible])

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function handleSaveDetail(id: string, patch: { name: string; weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros }) {
    update(id, {
      name: patch.name,
      weightG: patch.weightG,
      kcalPer100g: patch.kcalPer100g,
      macrosPer100g: patch.macrosPer100g,
      kcal: kcalForWeight(patch.kcalPer100g ?? 0, patch.weightG),
    })
  }

  function handleConfirm() {
    const items = rows
      .filter((r) => r.included)
      .map((r) =>
        lineToFoodItem(
          { id: r.id, name: r.name.trim() || 'Item', weightG: r.weightG, kcal: r.kcal, isFood: true },
          r.macrosPer100g
        )
      )
    onConfirm(items)
    onClose()
  }

  const includedCount = rows.filter((r) => r.included).length
  const detailRow = rows.find((r) => r.id === detailId) ?? null
  const detailDraft: ReceiptLineDraft | null = detailRow
    ? { id: detailRow.id, name: detailRow.name, weightG: detailRow.weightG, kcalPer100g: detailRow.kcalPer100g, macrosPer100g: detailRow.macrosPer100g }
    : null

  return (
    <>
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
                    <Text style={styles.meta}>{r.weightG.toLocaleString()} g · {r.kcal.toLocaleString()} kcal</Text>
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
      </Modal>

      <ReceiptLineDetail
        visible={detailId != null}
        line={detailDraft}
        onSave={handleSaveDetail}
        onClose={() => setDetailId(null)}
      />
    </>
  )
}
