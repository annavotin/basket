import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Keyboard, Platform, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { useColors } from '../styles/ThemeProvider'
import { FoodItem } from '../types'

type Props = {
  visible: boolean
  item: FoodItem | null
  onSave: (item: FoodItem) => void
  onClose: () => void
}

export default function EditItemSheet({ visible, item, onSave, onClose }: Props) {
  const colors = useColors()
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [kcal, setKcal] = useState('')
  const [quantity, setQuantity] = useState(1)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 36,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, alignSelf: 'center' },
    fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
    input: {
      width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    stepBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.selectedDay,
      alignItems: 'center', justifyContent: 'center',
    },
    stepBtnText: { fontSize: 20, color: colors.selectedDayText, lineHeight: 24 },
    stepValue: {
      fontSize: 18, fontWeight: '600', color: colors.kcalText,
      marginHorizontal: 20, minWidth: 30, textAlign: 'center',
    },
    saveBtn: {
      backgroundColor: colors.selectedDay, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center', marginTop: 24,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
    cancelBtn: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
    cancelText: { color: colors.monthText, fontSize: 15 },
  }), [colors])

  useEffect(() => {
    if (!item) return
    setName(item.name)
    setWeight(String(item.weightG))
    setKcal(String(item.kcal))
    setQuantity(item.quantity ?? 1)
  }, [item, visible])

  const weightNum = parseFloat(weight) || 0
  const kcalNum = parseInt(kcal, 10) || 0
  const canSave = name.trim().length > 0 && weightNum > 0

  function handleSave() {
    if (!canSave || !item) return
    onSave({
      ...item,
      name: name.trim(),
      weightG: weightNum,
      kcal: kcalNum,
      quantity,
    })
    Keyboard.dismiss()
    onClose()
  }

  function handleDecrement() {
    setQuantity((q) => Math.max(1, q - 1))
  }

  function handleIncrement() {
    setQuantity((q) => q + 1)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="edit-item-sheet">
              <Text style={styles.title}>Edit item</Text>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                testID="edit-name-input"
                style={styles.input}
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Weight (g)</Text>
              <TextInput
                testID="edit-weight-input"
                style={styles.input}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Calories (kcal)</Text>
              <TextInput
                testID="edit-kcal-input"
                style={styles.input}
                keyboardType="numeric"
                value={kcal}
                onChangeText={setKcal}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Quantity</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  testID="edit-qty-decrement"
                  style={styles.stepBtn}
                  onPress={handleDecrement}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text testID="edit-qty-value" style={styles.stepValue}>{quantity}</Text>
                <TouchableOpacity
                  testID="edit-qty-increment"
                  style={styles.stepBtn}
                  onPress={handleIncrement}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                testID="save-edit-button"
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveBtnText}>Save</Text>
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
