import React, { useEffect, useMemo, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import DismissArea from './DismissArea'
import NutritionFields from './NutritionFields'
import { Macros, NutritionBasis } from '../types'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

export type ReceiptLineDraft = {
  id: string
  name: string
  weightG: number
  kcalPer100g: number | null
  macrosPer100g?: Macros
}

type Props = {
  visible: boolean
  line: ReceiptLineDraft | null
  onSave: (id: string, patch: { name: string; weightG: number; kcalPer100g: number | null; macrosPer100g?: Macros }) => void
  onClose: () => void
}

export default function ReceiptLineDetail({ visible, line, onSave, onClose }: Props) {
  const colors = useColors()
  const [name, setName] = useState('')
  const [weightStr, setWeightStr] = useState('')
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>(undefined)
  const [basis, setBasis] = useState<NutritionBasis>('total')

  useEffect(() => {
    if (line) {
      setName(line.name)
      setWeightStr(String(line.weightG))
      setKcalPer100g(line.kcalPer100g)
      setMacrosPer100g(line.macrosPer100g)
      setBasis('total')
    }
  }, [line, visible])

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      paddingTop: 22, paddingHorizontal: 22, paddingBottom: 30,
      maxHeight: '90%',
    },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    label: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginBottom: 6 },
    nameInput: {
      fontFamily: fonts.head, fontSize: 19, color: colors.forest,
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.sageBg2,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
    },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
    fieldL: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.num, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 80, padding: 0 },
    nutritionCard: { backgroundColor: colors.sageBg2, borderRadius: 16, padding: 14, marginBottom: 16 },
    seclbl: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginBottom: 10 },
    row: { flexDirection: 'row', gap: 9 },
    btn: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: colors.forest },
    btnTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
    ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line, flex: 0, width: 100 },
    ghostTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.moss },
  }), [colors])

  if (!line) return null

  const currentLine = line
  const weightNum = parseFloat(weightStr) || 0
  const isEstimated = macrosPer100g == null

  function handleSave() {
    onSave(currentLine.id, {
      name: name.trim() || currentLine.name,
      weightG: weightNum,
      kcalPer100g,
      macrosPer100g,
    })
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="receipt-line-detail">
              <View style={styles.grab} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  testID="rld-name"
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                />

                <View style={styles.field}>
                  <Text style={styles.fieldL}>Weight (g)</Text>
                  <TextInput
                    testID="rld-weight"
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={weightStr}
                    onChangeText={setWeightStr}
                    selectTextOnFocus
                  />
                </View>

                <View style={styles.nutritionCard}>
                  <Text style={styles.seclbl}>Macros{isEstimated ? ' · estimated' : ''}</Text>
                  <NutritionFields
                    basis={basis}
                    onBasisChange={setBasis}
                    G={weightNum}
                    kcalPer100g={kcalPer100g}
                    macrosPer100g={macrosPer100g}
                    onChange={({ kcalPer100g, macrosPer100g }) => { setKcalPer100g(kcalPer100g); setMacrosPer100g(macrosPer100g) }}
                    editable
                  />
                </View>

                <View style={styles.row}>
                  <TouchableOpacity testID="rld-cancel" style={[styles.btn, styles.ghost]} onPress={onClose}>
                    <Text style={styles.ghostTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="rld-save" style={styles.btn} onPress={handleSave}>
                    <Text style={styles.btnTxt}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>
    </Modal>
  )
}
