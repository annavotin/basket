import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { ReceiptLine, FoodItem } from '../types'
import { lineToFoodItem } from '../utils/receipt'
import { useColors } from '../styles/ThemeProvider'

type Props = {
  visible: boolean
  lines: ReceiptLine[]
  onConfirm: (items: FoodItem[]) => void
  onClose: () => void
}

type Row = {
  id: string
  name: string
  weight: string
  kcal: string
  included: boolean
}

function toRows(lines: ReceiptLine[]): Row[] {
  return lines.map((l) => ({
    id: l.id,
    name: l.name,
    weight: String(l.weightG),
    kcal: String(l.kcal),
    included: l.isFood,
  }))
}

export default function ReceiptReviewSheet({ visible, lines, onConfirm, onClose }: Props) {
  const colors = useColors()
  const [rows, setRows] = useState<Row[]>(() => toRows(lines))

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
      padding: 10,
      marginBottom: 8,
    },
    check: {
      width: 26,
      height: 26,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cycleBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    checkOn: { backgroundColor: colors.cycleBar, borderColor: colors.cycleBar },
    checkMark: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    fields: { flex: 1 },
    nameInput: { fontSize: 15, fontWeight: '600', color: colors.kcalText, paddingVertical: 2 },
    numRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    numInput: {
      minWidth: 52,
      borderBottomWidth: 1,
      borderColor: '#DDDDDD',
      fontSize: 13,
      color: colors.monthText,
      paddingVertical: 2,
      marginRight: 2,
    },
    unit: { fontSize: 13, color: colors.monthText, marginRight: 12 },
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

  function handleConfirm() {
    const items = rows
      .filter((r) => r.included)
      .map((r) =>
        lineToFoodItem({
          id: r.id,
          name: r.name.trim() || 'Item',
          weightG: parseInt(r.weight, 10) || 0,
          kcal: parseInt(r.kcal, 10) || 0,
          isFood: true,
        })
      )
    onConfirm(items)
    onClose()
  }

  const includedCount = rows.filter((r) => r.included).length

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
                <View style={styles.fields}>
                  <TextInput
                    testID={`name-${r.id}`}
                    style={styles.nameInput}
                    value={r.name}
                    onChangeText={(t) => update(r.id, { name: t })}
                  />
                  <View style={styles.numRow}>
                    <TextInput
                      testID={`weight-${r.id}`}
                      style={styles.numInput}
                      keyboardType="numeric"
                      value={r.weight}
                      onChangeText={(t) => update(r.id, { weight: t })}
                    />
                    <Text style={styles.unit}>g</Text>
                    <TextInput
                      testID={`kcal-${r.id}`}
                      style={styles.numInput}
                      keyboardType="numeric"
                      value={r.kcal}
                      onChangeText={(t) => update(r.id, { kcal: t })}
                    />
                    <Text style={styles.unit}>kcal</Text>
                  </View>
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
    </Modal>
  )
}
