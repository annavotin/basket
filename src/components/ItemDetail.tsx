import React, { useMemo, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import type { Palette } from '../styles/palette'
import { FoodItem, ExtraMeal, PantryItem, Macros } from '../types'
import { itemMacros, kcalDerivedMacros } from '../utils/nutrition'
import { EditIcon } from './icons'

type Kind = 'item' | 'extra' | 'pantry'
const SRC_LABELS: Record<string, string> = { barcode: 'Scanned', receipt: 'Receipt', manual: 'Manual', carry: 'Carried over' }
const MAC_DEFS: { key: keyof Macros; label: string; kcalPerG: number; fillKey: keyof Palette; trackColor: string }[] = [
  { key: 'protein', label: 'Protein', kcalPerG: 4, fillKey: 'rose',        trackColor: 'rgba(197,106,76,0.15)' },
  { key: 'carbs',   label: 'Carbs',   kcalPerG: 4, fillKey: 'pantry',      trackColor: 'rgba(217,164,65,0.18)' },
  { key: 'fat',     label: 'Fat',     kcalPerG: 9, fillKey: 'matchaDeep',  trackColor: 'rgba(70,97,47,0.15)' },
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
  onSaveItem?: (patch: Partial<FoodItem>) => void
  onSaveExtra?: (patch: { name: string; kcal: number; macros: Macros }) => void
  onSavePantry?: (patch: { name?: string; kcalPer100g: number; dailyG: number; thisWeekG: number }) => void
  onRemove: () => void
  onClose: () => void
}

const num = (s: string) => (parseFloat(s) > 0 ? parseFloat(s) : 0)

export default function ItemDetail(props: Props) {
  const { visible, kind, item, extra, pantryItem, pantryWeekG, days, dateLabel, onClose, onRemove } = props
  const colors = useColors()
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const [name, setName] = useState('')
  const [weightStr, setWeightStr] = useState('')
  const [kcalStr, setKcalStr] = useState('')
  const [qtyStr, setQtyStr] = useState('1')
  const [pStr, setPStr] = useState('0')
  const [cStr, setCStr] = useState('0')
  const [fStr, setFStr] = useState('0')
  const [per100Str, setPer100Str] = useState('0')
  const [dailyStr, setDailyStr] = useState('0')
  const [weekStr, setWeekStr] = useState('0')

  function seed() {
    setConfirmDel(false)
    if (kind === 'item' && item) {
      const m = itemMacros({ ...item, quantity: 1 })
      setName(item.name)
      setWeightStr(String(item.weightG))
      setKcalStr(String(item.kcal))
      setQtyStr(String(item.quantity ?? 1))
      setPStr(String(Math.round(m.protein)))
      setCStr(String(Math.round(m.carbs)))
      setFStr(String(Math.round(m.fat)))
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
    const newW = num(next), oldW = num(weightStr)
    const ratio = oldW > 0 && newW > 0 ? newW / oldW : 1
    if (oldW > 0 && newW > 0) {
      setKcalStr(String(Math.round(num(kcalStr) * ratio)))
      setPStr(String(Math.round(num(pStr) * ratio)))
      setCStr(String(Math.round(num(cStr) * ratio)))
      setFStr(String(Math.round(num(fStr) * ratio)))
    }
    setWeightStr(next)
  }

  function saveItem() {
    const w = Math.round(num(weightStr))
    const perUnitKcal = Math.round(num(kcalStr))
    const macrosPer100g: Macros = w > 0
      ? { protein: (num(pStr) / w) * 100, carbs: (num(cStr) / w) * 100, fat: (num(fStr) / w) * 100 }
      : (item?.macrosPer100g ?? { protein: 0, carbs: 0, fat: 0 })
    props.onSaveItem?.({ name: name.trim() || item?.name || 'Item', weightG: w, kcal: perUnitKcal, quantity: Math.max(1, Math.round(num(qtyStr))), macrosPer100g })
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

  const editingItem = editing && kind === 'item'
  const editingExtra = editing && kind === 'extra'
  const editingMacros = editingItem || editingExtra
  const macroGrams: Macros = editingMacros
    ? { protein: num(pStr), carbs: num(cStr), fat: num(fStr) }
    : kind === 'item' && item ? itemMacros(item)
    : kind === 'extra' && extra?.macros ? extra.macros
    : kcalDerivedMacros(cals)
  const macroKcal = MAC_DEFS.map((d) => macroGrams[d.key] * d.kcalPerG)
  const macroSum = Math.max(1, macroKcal.reduce((s, v) => s + v, 0))

  const removeLabel = kind === 'extra' ? 'Delete this extra' : kind === 'pantry' ? 'Remove staple' : 'Remove from basket'
  const estimated = kind === 'pantry' || (kind === 'extra' && !extra?.macros)

  const styles = useMemo(() => StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    scrimFill: { flex: 1 },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 22, maxHeight: '90%' },
    sheetBody: { paddingHorizontal: 22, paddingBottom: 34 },
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
    when: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss, marginTop: 14 },
    seclbl: { fontFamily: fonts.bodyExtra, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.mossFaint, marginTop: 18, marginBottom: 10 },
    macroRow: { gap: 11 },
    macro: { },
    macroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    macroL: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss },
    macroV: { fontFamily: fonts.num, fontSize: 13, color: colors.forest },
    macroBar: { height: 7, borderRadius: 4, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 4 },
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.scrimFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
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
              <View style={styles.stat}><Text style={styles.statV}>{item.weightG.toLocaleString()}g</Text><Text style={styles.statL}>bought</Text></View>
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

          <Text style={styles.seclbl}>Macros{editingMacros ? ' · tap to edit' : estimated ? ' · estimated' : ''}</Text>
          <View style={styles.macroRow}>
            {MAC_DEFS.map((d, i) => (
              <View style={styles.macro} key={d.key}>
                <View style={styles.macroTop}>
                  <Text style={styles.macroL}>{d.label}</Text>
                  {editingMacros
                    ? <TextInput testID={`id-macro-${d.key}`} style={styles.macroInput} keyboardType="numeric" selectTextOnFocus
                        value={d.key === 'protein' ? pStr : d.key === 'carbs' ? cStr : fStr}
                        onChangeText={d.key === 'protein' ? setPStr : d.key === 'carbs' ? setCStr : setFStr} />
                    : <Text style={styles.macroV}>{Math.round(macroGrams[d.key])}g</Text>}
                </View>
                <View style={[styles.macroBar, { backgroundColor: d.trackColor }]}><View style={[styles.macroFill, { width: `${(macroKcal[i] / macroSum) * 100}%`, backgroundColor: colors[d.fillKey] }]} /></View>
              </View>
            ))}
          </View>

          {editing && kind === 'item' && (
            <View style={{ marginTop: 16 }}>
              {renderField('Name', name, setName, 'id-name', 'default', true)}
              {renderField('Calories', kcalStr, setKcalStr, 'id-kcal')}
              {renderField('Weight (g)', weightStr, onWeight, 'id-weight')}
              {renderField('Quantity', qtyStr, setQtyStr, 'id-qty')}
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
                <TouchableOpacity style={[styles.btn, styles.ghost, { flex: 0, width: 100 }]} onPress={() => setEditing(false)}><Text style={styles.ghostTxt}>Cancel</Text></TouchableOpacity>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
