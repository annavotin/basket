import React, { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { colors } from '../styles/colors'
import { PantryItem } from '../types'

type Props = {
  visible: boolean
  pantry: PantryItem[]
  onAdd: (draft: { name: string; kcalPer100g: number; dailyG: number }) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export default function PantryScreen({ visible, pantry, onAdd, onRemove, onClose }: Props) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [grams, setGrams] = useState('')

  const kcalNum = parseFloat(kcal) || 0
  const gramsNum = parseFloat(grams) || 0
  const canAdd = name.trim().length > 0 && kcalNum > 0 && gramsNum > 0

  function handleAdd() {
    if (!canAdd) return
    onAdd({ name: name.trim(), kcalPer100g: kcalNum, dailyG: gramsNum })
    setName('')
    setKcal('')
    setGrams('')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} testID="pantry-screen">
        <View style={styles.topBar}>
          <TouchableOpacity testID="pantry-close" onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pantry</Text>
          <View style={styles.backBtn} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>Staples you eat regularly</Text>

            {pantry.map((item) => (
              <View key={item.id} testID="pantry-row" style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.emoji} {item.name}</Text>
                  <Text style={styles.rowMeta}>{item.dailyG} g/day · {item.kcalPer100g} kcal/100g</Text>
                </View>
                <TouchableOpacity
                  testID="pantry-remove"
                  onPress={() => onRemove(item.id)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              testID="pantry-name-input"
              style={styles.input}
              placeholder="e.g. Oats"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>kcal / 100 g</Text>
            <TextInput
              testID="pantry-kcal-input"
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 379"
              value={kcal}
              onChangeText={setKcal}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Grams / day</Text>
            <TextInput
              testID="pantry-grams-input"
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 40"
              value={grams}
              onChangeText={setGrams}
              returnKeyType="done"
            />

            <TouchableOpacity
              testID="pantry-add"
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={styles.addBtnText}>Add staple</Text>
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
  subtitle: { fontSize: 13, color: colors.monthText, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.kcalText },
  rowMeta: { fontSize: 12, color: colors.monthText, marginTop: 2 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  removeBtnText: { fontSize: 16, color: colors.monthText },
  fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  addBtn: {
    backgroundColor: colors.selectedDay, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
})
