import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  dailyGoal: number
  onSave: (goal: number) => void
  onClose: () => void
}

export default function ProfileScreen({ visible, dailyGoal, onSave, onClose }: Props) {
  const [value, setValue] = useState(String(dailyGoal))

  useEffect(() => {
    setValue(String(dailyGoal))
  }, [dailyGoal, visible])

  const parsed = parseInt(value, 10)
  const canSave = !isNaN(parsed) && parsed > 0

  function handleSave() {
    if (!canSave) return
    onSave(parsed)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <Text style={styles.title}>Profile</Text>

              <Text style={styles.fieldLabel}>Daily calorie goal (kcal)</Text>
              <TextInput
                testID="daily-goal-input"
                style={styles.input}
                keyboardType="numeric"
                value={value}
                onChangeText={setValue}
                returnKeyType="done"
              />

              <TouchableOpacity
                testID="save-profile"
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="profile-close" style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Close</Text>
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
