import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Macros, NutritionBasis } from '../types'
import { toBasis, fromBasis, roundTenth } from '../utils/nutrition'

type Props = {
  basis: NutritionBasis
  onBasisChange: (b: NutritionBasis) => void
  G: number // per-unit weightG (one pack); the "per pack" basis scales by this, not by quantity
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

  // handleChange's own onChange() causes the parent to hand new kcalPer100g/macrosPer100g
  // props right back down — without this guard, that echo re-syncs `values` from canonical
  // and clobbers whatever the user typed into a SIBLING field a moment earlier but hasn't
  // committed yet (e.g. clearing Protein then Carbs: Carbs's blank gets stomped back to its
  // last canonical value by Protein's own round-trip before the user finishes). Set right
  // before onChange, consumed (and cleared) by the very next effect run.
  const skipNextSyncRef = useRef(false)

  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false
      return
    }
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
    skipNextSyncRef.current = true
    onChange({ kcalPer100g: k, macrosPer100g: macros })
  }

  const unit = effectiveBasis === 'per100g' ? '/ 100g' : 'per pack'
  const styles = useMemo(() => StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    lbl: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.mossFaint },
    // Styled to match the quantity Stepper: recessed track + raised white active pill.
    // Track uses `line` (not sageBg2) so it stays visible on sageBg2 card backgrounds.
    seg: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: 11, padding: 3 },
    segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    segOn: {
      backgroundColor: colors.white,
      shadowColor: '#2C3A1E', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
    },
    segDisabled: { opacity: 0.4 },
    segTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.moss },
    segTxtOn: { color: colors.forest },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    name: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: {
      fontFamily: fonts.num, fontSize: 15, color: colors.forest, textAlign: 'right', minWidth: 64,
      borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    },
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
                <Text style={[styles.segTxt, effectiveBasis === b && styles.segTxtOn]}>{b === 'per100g' ? 'per 100g' : 'per pack'}</Text>
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
