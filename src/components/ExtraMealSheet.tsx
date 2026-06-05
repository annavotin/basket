import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Keyboard, Platform, StyleSheet,
} from 'react-native'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  onSave: (draft: { name: string; kcal: number }) => void
  onClose: () => void
}

export default function ExtraMealSheet({ visible, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')

  useEffect(() => {
    setName('')
    setKcal('')
  }, [visible])

  const kcalNum = parseInt(kcal, 10) || 0
  const canSave = name.trim().length > 0 && kcalNum > 0

  function handleSave() {
    if (!canSave) return
    onSave({ name: name.trim(), kcal: kcalNum })
    Keyboard.dismiss()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="extra-meal-sheet">
              <Text style={styles.title}>Add extra meal</Text>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                testID="extra-desc-input"
                style={styles.input}
                placeholder="e.g. Sushi with friends"
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Estimated calories</Text>
              <TextInput
                testID="extra-kcal-input"
                style={styles.input}
                keyboardType="numeric"
                value={kcal}
                onChangeText={setKcal}
                returnKeyType="done"
              />

              <TouchableOpacity
                testID="save-extra-button"
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveBtnText}>Save extra meal</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-button" style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
    padding: 24, paddingBottom: 36,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, alignSelf: 'center' },
  fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.selectedDay, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
  cancelText: { color: colors.monthText, fontSize: 15 },
})
