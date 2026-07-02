import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Macros, NutritionBasis } from '../types'
import { toBasis, fromBasis, roundTenth } from '../utils/nutrition'

type Props = {
  basis: NutritionBasis
  onBasisChange: (b: NutritionBasis) => void
  G: number // weightG × quantity
  kcalPer100g: number | null // canonical
  macrosPer100g?: Macros // canonical
  onChange: (next: { kcalPer100g: number | null; macrosPer100g?: Macros }) => void
  editable: boolean
}

// Canonical per-100g -> string shown in `basis` over G grams. Blank when canonical is unset.
const show = (per100: number | null | undefined, G: number, basis: NutritionBasis) =>
  per100 == null ? '' : String(roundTenth(toBasis(per100, G, basis)))

// String shown in `basis` -> canonical per-100g (rounded). Blank/NaN -> null (not 0).
const canon = (s: string, G: number, basis: NutritionBasis): number | null => {
  const n = parseFloat(s)
  return s.trim() === '' || isNaN(n) ? null : roundTenth(fromBasis(n, G, basis))
}

type FieldDef = { label: string; testID: string; key: 'kcal' | 'protein' | 'carbs' | 'fat' }
const FIELDS: FieldDef[] = [
  { label: 'Calories', testID: 'nf-kcal', key: 'kcal' },
  { label: 'Protein', testID: 'nf-protein', key: 'protein' },
  { label: 'Carbs', testID: 'nf-carbs', key: 'carbs' },
  { label: 'Fat', testID: 'nf-fat', key: 'fat' },
]

export default function NutritionFields({ basis, onBasisChange, G, kcalPer100g, macrosPer100g, onChange, editable }: Props) {
  const colors = useColors()
  // "total" needs a known weight to convert; with G <= 0 there's nothing to scale by, so fall
  // back to per-100g entry (and disable the total toggle) rather than silently zeroing values.
  const totalDisabled = G <= 0
  const effectiveBasis: NutritionBasis = basis === 'total' && totalDisabled ? 'per100g' : basis
  const [values, setValues] = useState<Record<FieldDef['key'], string>>({
    kcal: show(kcalPer100g, G, effectiveBasis),
    protein: show(macrosPer100g?.protein, G, effectiveBasis),
    carbs: show(macrosPer100g?.carbs, G, effectiveBasis),
    fat: show(macrosPer100g?.fat, G, effectiveBasis),
  })

  useEffect(() => {
    setValues({
      kcal: show(kcalPer100g, G, effectiveBasis),
      protein: show(macrosPer100g?.protein, G, effectiveBasis),
      carbs: show(macrosPer100g?.carbs, G, effectiveBasis),
      fat: show(macrosPer100g?.fat, G, effectiveBasis),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, G, kcalPer100g, macrosPer100g])

  const handleChange = (key: FieldDef['key'], text: string) => {
    const next = { ...values, [key]: text }
    setValues(next)

    const k = canon(next.kcal, G, effectiveBasis)
    const mp = canon(next.protein, G, effectiveBasis)
    const mc = canon(next.carbs, G, effectiveBasis)
    const mf = canon(next.fat, G, effectiveBasis)
    const macros = mp == null && mc == null && mf == null
      ? undefined
      : { protein: mp ?? 0, carbs: mc ?? 0, fat: mf ?? 0 }
    onChange({ kcalPer100g: k, macrosPer100g: macros })
  }

  const unit = effectiveBasis === 'per100g' ? '/ 100g' : 'total'
  const styles = useMemo(() => StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    lbl: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.mossFaint },
    seg: { flexDirection: 'row', backgroundColor: colors.sageBg2, borderRadius: 10, padding: 2 },
    segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    segOn: { backgroundColor: colors.white },
    segDisabled: { opacity: 0.4 },
    segTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.moss },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
    name: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.num, fontSize: 15, color: colors.forest, textAlign: 'right', minWidth: 70, padding: 0 },
    unit: { fontFamily: fonts.body, fontSize: 11, color: colors.mossFaint, marginLeft: 6, minWidth: 42 },
  }), [colors])

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.lbl}>Nutrition</Text>
        <View style={styles.seg}>
          {(['per100g', 'total'] as NutritionBasis[]).map((b) => {
            const disabled = b === 'total' && totalDisabled
            return (
              <TouchableOpacity
                key={b}
                testID={`nf-basis-${b}`}
                disabled={disabled}
                style={[styles.segBtn, effectiveBasis === b && styles.segOn, disabled && styles.segDisabled]}
                onPress={() => onBasisChange(b)}
              >
                <Text style={styles.segTxt}>{b === 'per100g' ? 'per 100g' : 'total'}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
      {FIELDS.map((f) => (
        <View style={styles.row} key={f.key}>
          <Text style={styles.name}>{f.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              testID={f.testID}
              style={styles.input}
              value={values[f.key]}
              editable={editable}
              keyboardType="decimal-pad"
              selectTextOnFocus
              onChangeText={(t) => handleChange(f.key, t)}
            />
            <Text style={styles.unit}>{f.key === 'kcal' ? `kcal ${unit}` : `g ${unit}`}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}
