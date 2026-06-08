import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
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
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} testID="profile-screen">
        <View style={styles.topBar}>
          <TouchableOpacity testID="profile-close" onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.backBtn} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 16, color: colors.monthText },
  title: { fontSize: 18, fontWeight: '700', color: colors.kcalText },
  body: { padding: 24 },
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
})
