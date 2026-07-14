import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { FoodItem, ExtraMeal, PantryItem, Macros, NutritionBasis } from '../types'
import { itemMacros, kcalDerivedMacros, kcalForWeight, roundTenth } from '../utils/nutrition'
import { EditIcon } from './icons'
import NutritionFields from './NutritionFields'
import Stepper from './settings/Stepper'

type Kind = 'item' | 'extra' | 'pantry'
const SRC_LABELS: Record<string, string> = { barcode: 'Scanned', receipt: 'Receipt', manual: 'Manual', carry: 'Carried over' }
const MAC_DEFS: { key: keyof Macros; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs',   label: 'Carbs' },
  { key: 'fat',     label: 'Fat' },
]

type Props = {
  visible: boolean
  kind: Kind
  item?: FoodItem
  extra?: ExtraMeal
  pantryItem?: PantryItem
  pantryWeekG?: number
  days: number
  dateLabel?: string
  basis?: NutritionBasis
  onBasisChange?: (b: NutritionBasis) => void
  onSaveItem?: (patch: Partial<FoodItem>) => void
  onSaveExtra?: (patch: { name: string; kcal: number; macros: Macros }) => void
  onSavePantry?: (patch: { name?: string; kcalPer100g: number; dailyG: number; thisWeekG: number }) => void
  onRemove: () => void
  onClose: () => void
}

const num = (s: string) => (parseFloat(s) > 0 ? parseFloat(s) : 0)

export default function ItemDetail(props: Props) {
  const { visible, kind, item, extra, pantryItem, pantryWeekG, days, dateLabel, basis, onBasisChange, onClose, onRemove } = props
  const colors = useColors()
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const sheetSlide = useRef(new Animated.Value(400)).current
  useEffect(() => {
    if (visible) {
      sheetSlide.setValue(400)
      Animated.spring(sheetSlide, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start()
    }
  }, [visible])

  const [name, setName] = useState('')
  const [weightStr, setWeightStr] = useState('')
  const [kcalStr, setKcalStr] = useState('')
  const [qty, setQty] = useState(1)
  const [pStr, setPStr] = useState('0')
  const [cStr, setCStr] = useState('0')
  const [fStr, setFStr] = useState('0')
  const [per100Str, setPer100Str] = useState('0')
  const [dailyStr, setDailyStr] = useState('0')
  const [weekStr, setWeekStr] = useState('0')
  const [kcalPer100g, setKcalPer100g] = useState<number | null>(null)
  const [macrosPer100g, setMacrosPer100g] = useState<Macros | undefined>(undefined)

  function seed() {
    setConfirmDel(false)
    if (kind === 'item' && item) {
      const m = itemMacros({ ...item, quantity: 1 })
      setName(item.name)
      setWeightStr(String(item.weightG))
      setKcalStr(String(item.kcal))
      setQty(Math.max(1, Math.round(item.quantity ?? 1)))
      setPStr(String(Math.round(m.protein)))
      setCStr(String(Math.round(m.carbs)))
      setFStr(String(Math.round(m.fat)))
      setKcalPer100g(item.weightG > 0 ? roundTenth((item.kcal / item.weightG) * 100) : null)
      setMacrosPer100g(item.macrosPer100g)
    } else if (kind === 'extra' && extra) {
      const em = extra.macros ?? kcalDerivedMacros(extra.kcal)
      setName(extra.name)
      setKcalStr(String(extra.kcal))
      setPStr(String(Math.round(em.protein)))
      setCStr(String(Math.round(em.carbs)))
      setFStr(String(Math.round(em.fat)))
    } else if (kind === 'pantry' && pantryItem) {
      setName(pantryItem.name)
      setPer100Str(String(pantryItem.kcalPer100g))
      setDailyStr(String(pantryItem.dailyG))
      setWeekStr(String(pantryWeekG ?? pantryItem.dailyG * days))
    }
  }
  function startEdit() { seed(); setEditing(true) }

  function onWeight(next: string) {
    // Weight only scales the *displayed* nutrition (via NutritionFields' G prop);
    // the canonical kcalPer100g/macrosPer100g are weight-independent and untouched here.
    setWeightStr(next)
  }

  function saveItem() {
    const w = Math.round(num(weightStr))
    if (w <= 0) return // guard: never persist a zero weight against nonzero kcal/macros
    const perUnitKcal = kcalForWeight(kcalPer100g ?? 0, w)
    props.onSaveItem?.({
      name: name.trim() || item?.name || 'Item',
      weightG: w,
      kcal: perUnitKcal,
      quantity: Math.max(1, qty),
      macrosPer100g,
    })
    setEditing(false)
  }
  function saveExtra() { props.onSaveExtra?.({ name: name.trim() || extra?.name || 'Extra', kcal: Math.max(0, Math.round(num(kcalStr))), macros: { protein: num(pStr), carbs: num(cStr), fat: num(fStr) } }); setEditing(false) }
  function savePantry() {
    props.onSavePantry?.({
      name: name.trim() || pantryItem?.name || 'Staple',
      kcalPer100g: Math.max(0, Math.round(num(per100Str))),
      dailyG: Math.max(0, Math.round(num(dailyStr))),
      thisWeekG: Math.max(0, Math.round(num(weekStr))),
    })
    setEditing(false)
  }

  const emoji = kind === 'extra' ? '🍴' : kind === 'pantry' ? '🥫' : (item?.emoji ?? '🛒')
  const displayName = kind === 'extra' ? extra?.name : kind === 'pantry' ? pantryItem?.name : item?.name
  const tag = kind === 'item' ? (SRC_LABELS[item?.source ?? 'manual'] ?? 'Manual') : kind === 'extra' ? 'Extra meal' : 'Pantry staple'

  let cals = 0
  if (kind === 'item' && item) cals = item.kcal * (item.quantity ?? 1)
  else if (kind === 'extra' && extra) cals = extra.kcal
  else if (kind === 'pantry' && pantryItem) cals = Math.round((pantryItem.dailyG * days * pantryItem.kcalPer100g) / 100)

  const boughtG = (item?.weightG ?? 0) * (item?.quantity ?? 1)

  const editingItem = editing && kind === 'item'
  const editingExtra = editing && kind === 'extra'
  const editingMacros = editingItem || editingExtra
  const macroGrams: Macros = editingMacros
    ? { protein: num(pStr), carbs: num(cStr), fat: num(fStr) }
    : kind === 'item' && item ? itemMacros(item)
    : kind === 'extra' && extra?.macros ? extra.macros
    : kcalDerivedMacros(cals)

  const removeLabel = kind === 'extra' ? 'Delete this extra' : kind === 'pantry' ? 'Remove staple' : 'Remove from basket'
  const estimated = kind === 'pantry' || (kind === 'extra' && !extra?.macros)

  const styles = useMemo(() => StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    scrimFill: { flex: 1 },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 22, maxHeight: '90%' },
    sheetBody: { paddingHorizontal: 22, paddingBottom: 50 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    av: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center' },
    avTxt: { fontSize: 27 },
    headTx: { flex: 1, minWidth: 0 },
    name: { fontFamily: fonts.head, fontSize: 19, color: colors.forest },
    tag: { fontFamily: fonts.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, color: colors.moss, marginTop: 3, backgroundColor: colors.sage100, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, alignSelf: 'flex-start' },
    kc: { alignItems: 'flex-end' },
    kcV: { fontFamily: fonts.num, fontSize: 22, color: colors.matchaDeep },
    kcL: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint },
    stats: { flexDirection: 'row', gap: 9, marginTop: 16 },
    stat: { flex: 1, backgroundColor: colors.sageBg2, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
    statV: { fontFamily: fonts.num, fontSize: 17, color: colors.forest },
    statL: { fontFamily: fonts.body, fontSize: 10, color: colors.mossFaint, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
    statSub: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint, marginTop: 2 },
    when: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss, marginTop: 14 },
    seclbl: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginTop: 18, marginBottom: 10 },
    macroRow: { gap: 14 },
    macroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    macroL: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss },
    macroV: { fontFamily: fonts.num, fontSize: 13, color: colors.forest },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 9 },
    fieldL: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.num, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 80, padding: 0 },
    inputName: { fontFamily: fonts.num, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 140, padding: 0 },
    // Filled pill so it reads as a tappable field, not plain display text.
    macroInput: { fontFamily: fonts.num, fontSize: 15, color: colors.forest, textAlign: 'right', minWidth: 60, backgroundColor: colors.sageBg2, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 4 },
    foot: { fontFamily: fonts.body, fontSize: 12, color: colors.mossFaint, textAlign: 'center', marginTop: 4, marginBottom: 10 },
    btn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 10, backgroundColor: colors.forest },
    btnTxt: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
    ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line },
    ghostTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.moss },
    row: { flexDirection: 'row', gap: 9 },
    danger: { backgroundColor: colors.roseDeep },
    confirm: { marginTop: 10, backgroundColor: 'rgba(180,92,124,.10)', borderRadius: 16, padding: 16 },
    confirmT: { fontFamily: fonts.display, fontSize: 15, color: colors.forest },
    confirmS: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.mossFaint, marginTop: 2, marginBottom: 12 },
  }), [colors])

  const renderField = (
    label: string, value: string, onChangeText: (t: string) => void, testID: string,
    keyboardType: 'numeric' | 'default' = 'numeric', isName = false,
  ) => (
    <View style={styles.field} key={testID}>
      <Text style={styles.fieldL}>{label}</Text>
      <TextInput testID={testID} style={isName ? styles.inputName : styles.input} value={value}
        onChangeText={onChangeText} keyboardType={keyboardType} selectTextOnFocus />
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.scrimFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetSlide }] }]}>
          <View style={styles.grab} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetBody}
          >

          <View style={styles.head}>
            <View style={styles.av}><Text style={styles.avTxt}>{emoji}</Text></View>
            <View style={styles.headTx}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.tag}>{tag}</Text>
            </View>
            <View style={styles.kc}>
              <Text style={styles.kcV}>{cals.toLocaleString()}</Text>
              <Text style={styles.kcL}>KCAL</Text>
            </View>
          </View>

          {kind === 'item' && item && !editing && (
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statV}>{boughtG.toLocaleString()} g</Text>
                <Text style={styles.statL}>bought</Text>
                {(item.quantity ?? 1) > 1 && (
                  <Text style={styles.statSub}>{item.quantity} × {item.weightG.toLocaleString()} g</Text>
                )}
              </View>
              <View style={styles.stat}><Text style={styles.statV}>{days ? Math.round(cals / days).toLocaleString() : cals}</Text><Text style={styles.statL}>kcal / day</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{item.weightG ? Math.round((item.kcal / item.weightG) * 100) : 0}</Text><Text style={styles.statL}>kcal / 100g</Text></View>
            </View>
          )}
          {kind === 'pantry' && pantryItem && !editing && (
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statV}>{pantryItem.kcalPer100g}</Text><Text style={styles.statL}>kcal / 100g</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{pantryItem.dailyG}g</Text><Text style={styles.statL}>per day</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{(pantryItem.dailyG * days).toLocaleString()}g</Text><Text style={styles.statL}>over {days} days</Text></View>
            </View>
          )}
          {kind === 'extra' && dateLabel && !editing && <Text style={styles.when}>Logged {dateLabel}</Text>}

          {!editingItem && (
            <>
              <Text style={styles.seclbl}>Macros{editingMacros ? ' · tap to edit' : estimated ? ' · estimated' : ''}</Text>
              <View style={styles.macroRow}>
                {MAC_DEFS.map((d) => (
                  <View style={styles.macroTop} key={d.key}>
                    <Text style={styles.macroL}>{d.label}</Text>
                    {editingMacros
                      ? <TextInput testID={`id-macro-${d.key}`} style={styles.macroInput} keyboardType="numeric" selectTextOnFocus
                          value={d.key === 'protein' ? pStr : d.key === 'carbs' ? cStr : fStr}
                          onChangeText={d.key === 'protein' ? setPStr : d.key === 'carbs' ? setCStr : setFStr} />
                      : <Text style={styles.macroV}>{Math.round(macroGrams[d.key])}g</Text>}
                  </View>
                ))}
              </View>
            </>
          )}

          {editing && kind === 'item' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-name', 'default', true)}
              <NutritionFields
                basis={basis ?? 'per100g'}
                onBasisChange={onBasisChange ?? (() => {})}
                G={num(weightStr)}
                kcalPer100g={kcalPer100g}
                macrosPer100g={macrosPer100g}
                onChange={({ kcalPer100g, macrosPer100g }) => { setKcalPer100g(kcalPer100g); setMacrosPer100g(macrosPer100g) }}
                editable
              />
              {renderField('Weight (g)', weightStr, onWeight, 'id-weight')}
              <View style={styles.field}>
                <Text style={styles.fieldL}>Quantity</Text>
                <Stepper value={qty} min={1} max={99} onChange={setQty} testID="id-qty" />
              </View>
            </View>
          )}
          {editing && kind === 'extra' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-extra-name', 'default', true)}
              {renderField('Calories', kcalStr, setKcalStr, 'id-extra-kcal')}
            </View>
          )}
          {editing && kind === 'pantry' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-pantry-name', 'default', true)}
              {renderField('Calories / 100g', per100Str, setPer100Str, 'id-pantry-per100')}
              {renderField('This week (g)', weekStr, setWeekStr, 'id-pantry-week')}
              {renderField('Per day (g)', dailyStr, setDailyStr, 'id-pantry-daily')}
            </View>
          )}

          {editing ? (
            <>
              {kind === 'item' && <Text style={styles.foot}>Change weight to rescale; tap any value to override.</Text>}
              <View style={styles.row}>
                <TouchableOpacity testID="id-cancel-edit" style={[styles.btn, styles.ghost, { flex: 0, width: 100 }]} onPress={() => setEditing(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={kind === 'item' ? saveItem : kind === 'extra' ? saveExtra : savePantry}><Text style={styles.btnTxt}>Save</Text></TouchableOpacity>
              </View>
            </>
          ) : confirmDel ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmT}>Delete {displayName}?</Text>
              <Text style={styles.confirmS}>This can't be undone.</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.ghost, { flex: 0, width: 100, marginTop: 0 }]} onPress={() => setConfirmDel(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.danger, { flex: 1, marginTop: 0 }]} onPress={onRemove}><Text style={styles.btnTxt}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity style={[styles.btn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }]} onPress={startEdit}><EditIcon size={15} color={colors.white} /><Text style={styles.btnTxt}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={() => setConfirmDel(true)}><Text style={styles.ghostTxt}>{removeLabel}</Text></TouchableOpacity>
            </>
          )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
