import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { useColors } from '../styles/ThemeProvider'
import { Macros } from '../types'
import { EstimateResult } from '../services/extra-estimate'

type Props = {
  visible: boolean
  onSave: (draft: { name: string; kcal: number; macros?: Macros }) => void
  onClose: () => void
  /** Whether the current device has a signed-in account. Gates the Estimate button's tap
   *  behavior (not its visibility) — see onEstimate for visibility. */
  signedIn?: boolean
  /** Present only when a backend is configured (App.tsx passes undefined otherwise), which
   *  also controls whether the Estimate button renders at all — same convention as
   *  AddItemSheet's onScanBarcode/onScanReceipt optional props. */
  onEstimate?: (description: string) => Promise<EstimateResult | null>
}

export default function ExtraMealSheet({ visible, onSave, onClose, signedIn = false, onEstimate }: Props) {
  const colors = useColors()
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [macrosRevealed, setMacrosRevealed] = useState(false)
  const [estimating, setEstimating] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    sheetContent: {
      padding: 24, paddingBottom: 36,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, alignSelf: 'center' },
    fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
    input: {
      width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    },
    estimateBtn: {
      borderWidth: 1, borderColor: colors.selectedDay, borderRadius: 10,
      paddingVertical: 10, alignItems: 'center', marginTop: 8,
    },
    estimateBtnDisabled: { opacity: 0.4 },
    estimateBtnText: { color: colors.selectedDay, fontSize: 14, fontWeight: '600' },
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
    setName('')
    setKcal('')
    setProtein('')
    setCarbs('')
    setFat('')
    setMacrosRevealed(false)
    setEstimating(false)
  }, [visible])

  const kcalNum = Math.round(parseFloat(kcal)) || 0
  const canSave = name.trim().length > 0 && kcalNum > 0
  const canEstimate = onEstimate != null && name.trim().length > 0 && !estimating

  async function handleEstimate() {
    if (!signedIn) {
      Alert.alert('Sign in to use AI estimates', 'Create an account or sign in from Settings to use AI-estimated calories.')
      return
    }
    if (!onEstimate) return
    setEstimating(true)
    const result = await onEstimate(name.trim())
    setEstimating(false)
    Keyboard.dismiss()
    if (!result) {
      Alert.alert("Couldn't estimate that", 'Try a more specific description, or enter calories manually.')
      return
    }
    setKcal(String(result.kcal))
    setProtein(String(result.protein))
    setCarbs(String(result.carbs))
    setFat(String(result.fat))
    setMacrosRevealed(true)
  }

  function handleSave() {
    if (!canSave) return
    const macros: Macros | undefined = macrosRevealed
      ? { protein: parseFloat(protein) || 0, carbs: parseFloat(carbs) || 0, fat: parseFloat(fat) || 0 }
      : undefined
    onSave({ name: name.trim(), kcal: kcalNum, macros })
    Keyboard.dismiss()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="extra-meal-sheet">
              <ScrollView
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
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

              {onEstimate != null && (
                <TouchableOpacity
                  testID="estimate-extra-button"
                  style={[styles.estimateBtn, !canEstimate && styles.estimateBtnDisabled]}
                  onPress={handleEstimate}
                  disabled={!canEstimate}
                >
                  {estimating
                    ? <ActivityIndicator testID="estimate-extra-spinner" color={colors.selectedDay} />
                    : <Text style={styles.estimateBtnText}>Estimate with AI</Text>}
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>Estimated calories</Text>
              <TextInput
                testID="extra-kcal-input"
                style={styles.input}
                keyboardType="numeric"
                value={kcal}
                onChangeText={setKcal}
                returnKeyType="done"
              />

              {macrosRevealed && (
                <>
                  <Text style={styles.fieldLabel}>Protein (g)</Text>
                  <TextInput
                    testID="extra-protein-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={protein}
                    onChangeText={setProtein}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldLabel}>Carbs (g)</Text>
                  <TextInput
                    testID="extra-carbs-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={carbs}
                    onChangeText={setCarbs}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldLabel}>Fat (g)</Text>
                  <TextInput
                    testID="extra-fat-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={fat}
                    onChangeText={setFat}
                    returnKeyType="done"
                  />
                </>
              )}

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
              </ScrollView>
            </View>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>
    </Modal>
  )
}
