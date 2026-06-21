import React, { useState, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { PantryItem, MealPrepCycle } from '../types'
import { pantryGramsForCycle, kcalForWeight } from '../utils/nutrition'

type Mode = 'defaults' | 'thisprep'

type Props = {
  visible: boolean
  pantry: PantryItem[]
  onAdd: (draft: { name: string; kcalPer100g: number; dailyG: number }) => void
  onRemove: (id: string) => void
  onClose: () => void
  // New optional props
  cycle?: MealPrepCycle | null
  cycleDays?: number
  onSetDefaultGrams?: (id: string, dailyG: number) => void
  onSetPantryGrams?: (id: string, grams: number) => void
  onResetPantryOverride?: (id: string) => void
  onOpenPantry?: (id: string) => void
}

function Stepper({
  value, step, suffix, onChange, min = 0, testIDDec, testIDInc, testIDVal,
}: {
  value: number
  step: number
  suffix: string
  onChange: (v: number) => void
  min?: number
  testIDDec?: string
  testIDInc?: string
  testIDVal?: string
}) {
  return (
    <View style={stepperStyles.wrap}>
      <TouchableOpacity
        testID={testIDDec}
        style={stepperStyles.btn}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Text style={stepperStyles.btnTxt}>−</Text>
      </TouchableOpacity>
      <Text testID={testIDVal} style={stepperStyles.val}>
        {value}<Text style={stepperStyles.suffix}>{suffix}</Text>
      </Text>
      <TouchableOpacity
        testID={testIDInc}
        style={stepperStyles.btn}
        onPress={() => onChange(value + step)}
      >
        <Text style={stepperStyles.btnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const stepperStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDF2E6', borderRadius: 13, padding: 4 },
  btn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontFamily: fonts.display, fontSize: 18, color: '#2C3A1E', lineHeight: 20 },
  val: { minWidth: 54, textAlign: 'center', fontFamily: fonts.display, fontSize: 15, color: '#2C3A1E' },
  suffix: { fontFamily: fonts.body, fontSize: 11, color: '#8A9A72' },
})

export default function PantryScreen({
  visible, pantry, onAdd, onRemove, onClose,
  cycle, cycleDays = 7, onSetDefaultGrams, onSetPantryGrams, onResetPantryOverride, onOpenPantry,
}: Props) {
  const colors = useColors()
  const [mode, setMode] = useState<Mode>('defaults')
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [grams, setGrams] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const kcalNum = parseFloat(kcal) || 0
  const gramsNum = parseFloat(grams) || 0
  const canAdd = name.trim().length > 0 && kcalNum > 0 && gramsNum > 0

  function handleAdd() {
    if (!canAdd) return
    onAdd({ name: name.trim(), kcalPer100g: kcalNum, dailyG: gramsNum })
    setName('')
    setKcal('')
    setGrams('')
    setShowAddForm(false)
  }

  const perDayDefaultKcal = pantry.reduce((s, p) => s + Math.round(p.dailyG * p.kcalPer100g / 100), 0)
  const prepTotalKcal = cycle
    ? pantry.reduce((s, p) => s + kcalForWeight(p.kcalPer100g, pantryGramsForCycle(p, cycle, cycleDays)), 0)
    : 0

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: colors.sageBg },
    top: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    },
    back: {
      width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#2C3A1E', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    backTxt: { fontFamily: fonts.display, fontSize: 22, color: colors.forest, lineHeight: 24 },
    ttl: { flex: 1, minWidth: 0 },
    ttlK: { fontFamily: fonts.head, fontSize: 19, color: colors.forest },
    ttlS: { fontFamily: fonts.body, fontSize: 12, color: colors.moss, marginTop: 2 },
    menuSpacer: { width: 42 },

    // Segmented toggle
    seg: {
      position: 'relative', flexDirection: 'row',
      marginHorizontal: 16, marginTop: 2, marginBottom: 4,
      backgroundColor: colors.sageBg2, borderRadius: 15, padding: 4,
    },
    segPill: {
      position: 'absolute', top: 4, bottom: 4,
      width: '50%',  // will be offset via left
      backgroundColor: colors.white, borderRadius: 11,
      shadowColor: '#2C3A1E', shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segBtn: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, zIndex: 2,
    },
    segBtnTxt: { fontFamily: fonts.display, fontSize: 14, color: colors.mossFaint },
    segBtnTxtOn: { color: colors.forest },

    scroll: { paddingHorizontal: 16, paddingBottom: 120 },

    // Note banner
    note: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      backgroundColor: colors.sageBg2, borderRadius: 16, padding: 12, marginTop: 12,
    },
    noteIcon: {
      width: 34, height: 34, borderRadius: 11, backgroundColor: colors.white,
      alignItems: 'center', justifyContent: 'center',
    },
    noteIconTxt: { fontSize: 18 },
    noteTxt: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: colors.moss, lineHeight: 18 },

    // This prep header
    prepH: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 14, marginTop: 2, marginBottom: 2,
      backgroundColor: colors.sageBg2, borderRadius: 18,
    },
    prepRng: { fontFamily: fonts.display, fontSize: 16, color: colors.forest },
    prepDays: {
      fontFamily: fonts.bodyExtra, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4,
      color: colors.matchaDeep, backgroundColor: colors.white,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },

    // Card list
    list: { gap: 11, marginTop: 13 },
    card: {
      backgroundColor: colors.white, borderRadius: 20, padding: 14,
      shadowColor: '#2C3A1E', shadowOpacity: 0.06, shadowRadius: 9, shadowOffset: { width: 0, height: 2 },
      elevation: 2, borderWidth: 1.5, borderColor: 'transparent',
    },
    cardCustom: {
      borderColor: colors.matcha,
    },
    cardH: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    av: {
      width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sageBg2,
      alignItems: 'center', justifyContent: 'center',
    },
    avTxt: { fontSize: 23 },
    nm: { flex: 1, minWidth: 0 },
    nmB: { fontFamily: fonts.display, fontSize: 16, color: colors.forest },
    nmS: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.mossFaint, marginTop: 2 },
    nmSCustom: { color: colors.matchaDeep },
    rmBtn: {
      width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    },
    rmTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.mossFaint },
    kcRight: { alignItems: 'flex-end' },
    kcV: { fontFamily: fonts.display, fontSize: 15, color: colors.matchaDeep },
    kcL: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint },
    resetBtn: {
      borderWidth: 1.5, borderColor: colors.matcha,
      backgroundColor: colors.white, borderRadius: 11,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    resetTxt: { fontFamily: fonts.display, fontSize: 12, color: colors.matchaDeep },

    cardCtrl: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 13, paddingTop: 13,
      borderTopWidth: 1.5, borderTopColor: colors.line,
    },
    ctrlL: { fontFamily: fonts.body, fontSize: 12, color: colors.moss },
    ctrlK: { marginLeft: 'auto' as const, fontFamily: fonts.display, fontSize: 14, color: colors.forest },
    ctrlKS: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.mossFaint },

    // Summary bar
    sum: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 14, padding: 14, borderRadius: 18,
      backgroundColor: colors.forest,
    },
    sumSpan: { fontFamily: fonts.body, fontSize: 13, color: colors.matchaSoft },
    sumB: { fontFamily: fonts.display, fontSize: 19, color: colors.white },

    // Add staple button
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: '100%', marginTop: 12,
      borderWidth: 1.5, borderStyle: 'dashed' as const, borderColor: colors.sage100,
      backgroundColor: colors.white, borderRadius: 18, paddingVertical: 15,
    },
    addBtnIc: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: colors.matcha, alignItems: 'center', justifyContent: 'center',
    },
    addBtnIcTxt: { fontFamily: fonts.display, fontSize: 17, color: '#fff', lineHeight: 20 },
    addBtnTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.forest },

    // Empty state
    empty: {
      alignItems: 'center' as const, paddingHorizontal: 30, paddingVertical: 32,
    },
    emptyE: { fontSize: 46, marginBottom: 12, opacity: 0.85 },
    emptyH: { fontFamily: fonts.head, fontSize: 18, color: colors.forest, marginBottom: 5 },
    emptyP: { fontFamily: fonts.body, fontSize: 13, color: colors.moss, textAlign: 'center' as const, lineHeight: 20 },

    // Add form
    addForm: { marginTop: 16, backgroundColor: colors.sageBg2, borderRadius: 18, padding: 15 },
    fieldLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.moss, marginTop: 14, marginBottom: 4 },
    input: {
      width: '100%', borderWidth: 1, borderColor: colors.line, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
      backgroundColor: colors.white, color: colors.forest,
    },
    formBtns: { flexDirection: 'row', gap: 9, marginTop: 20 },
    formCancel: {
      flex: 0, width: 90, borderRadius: 14, paddingVertical: 13,
      alignItems: 'center', borderWidth: 1.5, borderColor: colors.line,
    },
    formCancelTxt: { fontFamily: fonts.display, fontSize: 14, color: colors.moss },
    formSave: {
      flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
      backgroundColor: colors.forest,
    },
    formSaveDisabled: { opacity: 0.4 },
    formSaveTxt: { fontFamily: fonts.display, fontSize: 14, color: '#fff' },
    pad: { height: 80 },
  }), [colors])

  const segPillOffset = mode === 'defaults' ? 4 : undefined
  // pill: left = 4 for defaults, left = 50% + 2 for thisprep (we handle via marginLeft trick)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} testID="pantry-screen">
        {/* Top bar */}
        <View style={styles.top}>
          <TouchableOpacity testID="pantry-close" onPress={onClose} style={styles.back}>
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={styles.ttl}>
            <Text style={styles.ttlK}>Pantry</Text>
            <Text style={styles.ttlS}>Staples in every meal prep</Text>
          </View>
          <View style={styles.menuSpacer} />
        </View>

        {/* Segmented toggle */}
        <View style={styles.seg} testID="pantry-seg">
          <View
            testID="pantry-seg-pill"
            style={[
              styles.segPill,
              mode === 'defaults'
                ? { left: 4 }
                : { left: undefined, right: 4 },
            ]}
          />
          <TouchableOpacity
            testID="seg-defaults"
            style={styles.segBtn}
            onPress={() => setMode('defaults')}
          >
            <Text style={[styles.segBtnTxt, mode === 'defaults' && styles.segBtnTxtOn]}>Defaults</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="seg-thisprep"
            style={styles.segBtn}
            onPress={() => setMode('thisprep')}
          >
            <Text style={[styles.segBtnTxt, mode === 'thisprep' && styles.segBtnTxtOn]}>This prep</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {mode === 'defaults' ? (
              <>
                {/* Note banner */}
                <View style={styles.note}>
                  <View style={styles.noteIcon}><Text style={styles.noteIconTxt}>♻️</Text></View>
                  <Text style={styles.noteTxt}>
                    Set a daily amount once — it's spread automatically across every prep, however long.
                  </Text>
                </View>

                {pantry.length > 0 ? (
                  <>
                    <View style={styles.list}>
                      {pantry.map((item) => {
                        const kcalDay = Math.round(item.dailyG * item.kcalPer100g / 100)
                        return (
                          <View key={item.id} testID="pantry-row" style={styles.card}>
                            <View style={styles.cardH}>
                              <View style={styles.av}><Text style={styles.avTxt}>{item.emoji}</Text></View>
                              <TouchableOpacity
                                testID={`pantry-edit-${item.id}`}
                                style={styles.nm}
                                onPress={() => onOpenPantry?.(item.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.nmB}>{item.name}</Text>
                                <Text style={styles.nmS}>{item.kcalPer100g} kcal / 100g</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                testID="pantry-remove"
                                onPress={() => onRemove(item.id)}
                                style={styles.rmBtn}
                              >
                                <Text style={styles.rmTxt}>✕</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.cardCtrl}>
                              <Text style={styles.ctrlL}>Per day</Text>
                              <Stepper
                                value={item.dailyG}
                                step={2}
                                suffix=" g"
                                onChange={(v) => onSetDefaultGrams?.(item.id, v)}
                                testIDDec={`dec-default-${item.id}`}
                                testIDInc={`inc-default-${item.id}`}
                                testIDVal={`val-default-${item.id}`}
                              />
                              <Text style={styles.ctrlK}>
                                {kcalDay}{' '}
                                <Text style={styles.ctrlKS}>kcal/day</Text>
                              </Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>

                    {/* Summary */}
                    <View style={styles.sum}>
                      <Text style={styles.sumSpan}>Adds to every day</Text>
                      <Text style={styles.sumB}>{perDayDefaultKcal.toLocaleString()} kcal</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyE}>🫙</Text>
                    <Text style={styles.emptyH}>No staples yet</Text>
                    <Text style={styles.emptyP}>Add the basics you always cook with — oils, grains, sauces.</Text>
                  </View>
                )}

                {/* Add staple button / form */}
                {showAddForm ? (
                  <View style={styles.addForm}>
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
                    <View style={styles.formBtns}>
                      <TouchableOpacity
                        style={styles.formCancel}
                        onPress={() => {
                          setShowAddForm(false)
                          setName(''); setKcal(''); setGrams('')
                        }}
                      >
                        <Text style={styles.formCancelTxt}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID="pantry-add"
                        style={[styles.formSave, !canAdd && styles.formSaveDisabled]}
                        onPress={handleAdd}
                        disabled={!canAdd}
                      >
                        <Text style={styles.formSaveTxt}>Add staple</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    testID="pantry-add-btn"
                    style={styles.addBtn}
                    onPress={() => setShowAddForm(true)}
                  >
                    <View style={styles.addBtnIc}>
                      <Text style={styles.addBtnIcTxt}>+</Text>
                    </View>
                    <Text style={styles.addBtnTxt}>Add a staple</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              /* --- This prep mode --- */
              <>
                {cycle ? (
                  <>
                    <View style={styles.prepH}>
                      <Text style={styles.prepRng}>{cycle.startDate} – {cycle.endDate}</Text>
                      <Text style={styles.prepDays}>{cycleDays} days</Text>
                    </View>

                    <View style={styles.note}>
                      <View style={styles.noteIcon}><Text style={styles.noteIconTxt}>✎</Text></View>
                      <Text style={styles.noteTxt}>
                        Tweak how much of each staple this specific prep uses. Defaults stay untouched.
                      </Text>
                    </View>

                    {pantry.length > 0 ? (
                      <>
                        <View style={styles.list}>
                          {pantry.map((item) => {
                            const grams = pantryGramsForCycle(item, cycle, cycleDays)
                            const defaultG = item.dailyG * cycleDays
                            const isCustom = grams !== defaultG
                            const kcalTotal = kcalForWeight(item.kcalPer100g, grams)
                            return (
                              <View
                                key={item.id}
                                testID="thisprep-row"
                                style={[styles.card, isCustom && styles.cardCustom]}
                              >
                                <View style={styles.cardH}>
                                  <View style={styles.av}><Text style={styles.avTxt}>{item.emoji}</Text></View>
                                  <View style={styles.nm}>
                                    <Text style={styles.nmB}>{item.name}</Text>
                                    <Text style={[styles.nmS, isCustom && styles.nmSCustom]}>
                                      {isCustom
                                        ? `Customised · default ${defaultG} g`
                                        : `Default · ${item.dailyG} g/day`}
                                    </Text>
                                  </View>
                                  {isCustom ? (
                                    <TouchableOpacity
                                      testID={`reset-${item.id}`}
                                      style={styles.resetBtn}
                                      onPress={() => onResetPantryOverride?.(item.id)}
                                    >
                                      <Text style={styles.resetTxt}>Reset</Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <View style={styles.kcRight}>
                                      <Text style={styles.kcV}>{kcalTotal.toLocaleString()}</Text>
                                      <Text style={styles.kcL}>KCAL</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.cardCtrl}>
                                  <Text style={styles.ctrlL}>This prep</Text>
                                  <Stepper
                                    value={grams}
                                    step={10}
                                    suffix=" g"
                                    onChange={(v) => onSetPantryGrams?.(item.id, v)}
                                    testIDDec={`dec-prep-${item.id}`}
                                    testIDInc={`inc-prep-${item.id}`}
                                    testIDVal={`val-prep-${item.id}`}
                                  />
                                  {isCustom && (
                                    <Text style={styles.ctrlK}>
                                      {kcalTotal.toLocaleString()}{' '}
                                      <Text style={styles.ctrlKS}>kcal</Text>
                                    </Text>
                                  )}
                                </View>
                              </View>
                            )
                          })}
                        </View>

                        <View style={styles.sum}>
                          <Text style={styles.sumSpan}>Pantry in this {cycleDays}-day prep</Text>
                          <Text style={styles.sumB}>{prepTotalKcal.toLocaleString()} kcal</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.empty}>
                        <Text style={styles.emptyE}>🫙</Text>
                        <Text style={styles.emptyH}>No staples to customise</Text>
                        <Text style={styles.emptyP}>Add defaults first, then fine-tune them here per prep.</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyE}>📅</Text>
                    <Text style={styles.emptyH}>No active prep</Text>
                    <Text style={styles.emptyP}>Start a meal prep cycle to customise pantry amounts for it.</Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.pad} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
