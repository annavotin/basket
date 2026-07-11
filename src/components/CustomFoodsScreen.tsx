import React, { useMemo, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { CustomFood, Macros } from '../types'
import ConfirmDialog, { MODAL_DISMISS_DELAY_MS } from './settings/ConfirmDialog'

type Props = {
  visible: boolean
  foods: CustomFood[]
  onClose: () => void
  onSave: (food: CustomFood) => void
  onDelete: (id: string) => void
}

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0
}

export default function CustomFoodsScreen({ visible, foods, onClose, onSave, onDelete }: Props) {
  const colors = useColors()
  const [editing, setEditing] = useState<CustomFood | null>(null)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [weight, setWeight] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function openEdit(food: CustomFood) {
    setConfirmDelete(false)
    setEditing(food)
    setName(food.name)
    setKcal(String(food.kcalPer100g))
    setWeight(food.packageWeightG ? String(food.packageWeightG) : '')
    setP(food.macrosPer100g ? String(food.macrosPer100g.protein) : '')
    setC(food.macrosPer100g ? String(food.macrosPer100g.carbs) : '')
    setF(food.macrosPer100g ? String(food.macrosPer100g.fat) : '')
  }

  function save() {
    if (!editing) return
    const hasMacros = [p, c, f].some((s) => s.trim() !== '')
    const macros: Macros | undefined = hasMacros
      ? { protein: num(p), carbs: num(c), fat: num(f) }
      : undefined
    onSave({
      ...editing,
      name: name.trim() || editing.name,
      kcalPer100g: num(kcal),
      packageWeightG: weight.trim() ? Math.round(num(weight)) : undefined,
      macrosPer100g: macros,
      updatedAt: Date.now(),
    })
    setEditing(null)
  }

  function remove() {
    if (!editing) return
    onDelete(editing.id)
    setConfirmDelete(false)
    // Defer closing the editing sheet until the confirm dialog has actually finished fading
    // out (see MODAL_DISMISS_DELAY_MS) — closing two stacked Modals in the same tick can leave
    // iOS's modal stack broken (an unresponsive black screen).
    setTimeout(() => setEditing(null), MODAL_DISMISS_DELAY_MS)
  }

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.sageBg },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
    backTxt: { fontSize: 22, color: colors.forest, lineHeight: 24 },
    ttl: { flex: 1 },
    ttlK: { fontFamily: fonts.head, fontSize: 19, color: colors.forest },
    ttlS: { fontFamily: fonts.body, fontSize: 12, color: colors.moss, marginTop: 2 },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 9 },
    av: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center' },
    avTxt: { fontSize: 24 },
    mid: { flex: 1, minWidth: 0 },
    nm: { fontFamily: fonts.head, fontSize: 15.5, color: colors.forest },
    meta: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: colors.mossFaint, marginTop: 2 },
    barcode: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mossFaint, marginTop: 2 },
    kc: { alignItems: 'flex-end' },
    kcV: { fontFamily: fonts.display, fontSize: 15, color: colors.matchaDeep },
    kcL: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint },
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
    emptyE: { fontSize: 46, marginBottom: 12 },
    emptyH: { fontFamily: fonts.head, fontSize: 18, color: colors.forest, marginBottom: 5 },
    emptyP: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss, textAlign: 'center', lineHeight: 20 },
    // edit sheet
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    scrimFill: { flex: 1 },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 16 },
    sheetH: { fontFamily: fonts.head, fontSize: 19, color: colors.forest, marginBottom: 14 },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.sageBg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 9 },
    fieldL: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.moss },
    input: { fontFamily: fonts.display, fontSize: 16, color: colors.forest, textAlign: 'right', minWidth: 80, padding: 0 },
    inputName: { minWidth: 150 },
    macrosRow: { flexDirection: 'row', gap: 9, marginBottom: 9 },
    macroField: { flex: 1, backgroundColor: colors.sageBg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
    macroL: { fontFamily: fonts.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, color: colors.moss, marginBottom: 3 },
    macroInput: { fontFamily: fonts.display, fontSize: 15, color: colors.forest, textAlign: 'center', minWidth: 40, padding: 0 },
    bc: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mossFaint, marginBottom: 14 },
    btn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: colors.forest },
    btnTxt: { fontFamily: fonts.display, fontSize: 16, color: '#fff' },
    del: { marginTop: 10, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(180,92,124,.12)', alignItems: 'center' },
    delTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.roseDeep },
  }), [colors])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.top}>
          <TouchableOpacity testID="myfoods-close" style={styles.back} onPress={onClose} accessibilityLabel="Back">
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={styles.ttl}>
            <Text style={styles.ttlK}>My Foods</Text>
            <Text style={styles.ttlS}>{foods.length} saved item{foods.length === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {foods.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyE}>🥣</Text>
            <Text style={styles.emptyH}>No saved foods yet</Text>
            <Text style={styles.emptyP}>Items you scan or add manually are saved here automatically, so you can reuse them and re-scan instantly.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {foods.map((food) => (
              <TouchableOpacity
                key={food.id}
                testID="myfood-row"
                style={styles.row}
                onPress={() => openEdit(food)}
                activeOpacity={0.7}
              >
                <View style={styles.av}><Text style={styles.avTxt}>{food.emoji || '🛒'}</Text></View>
                <View style={styles.mid}>
                  <Text style={styles.nm} numberOfLines={1}>{food.name}</Text>
                  <Text style={styles.meta}>
                    {food.kcalPer100g} kcal/100g{food.packageWeightG ? ` · ${food.packageWeightG} g pack` : ''}
                  </Text>
                  {food.barcode ? <Text style={styles.barcode}>🏷️ {food.barcode}</Text> : null}
                </View>
                <View style={styles.kc}>
                  <Text style={styles.kcV}>{food.kcalPer100g}</Text>
                  <Text style={styles.kcL}>KCAL/100G</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Modal visible={editing != null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
          <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity style={styles.scrimFill} activeOpacity={1} onPress={() => setEditing(null)} />
            <View style={styles.sheet}>
              <View style={styles.grab} />
              <Text style={styles.sheetH}>Edit food</Text>
              <View style={styles.field}>
                <Text style={styles.fieldL}>Name</Text>
                <TextInput testID="cf-name" style={[styles.input, styles.inputName]} value={name} onChangeText={setName} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldL}>Calories / 100g</Text>
                <TextInput testID="cf-kcal" style={styles.input} value={kcal} onChangeText={setKcal} keyboardType="numeric" selectTextOnFocus />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldL}>Package weight (g)</Text>
                <TextInput testID="cf-weight" style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="" placeholderTextColor={colors.mossFaint} selectTextOnFocus />
              </View>
              <View style={styles.macrosRow}>
                {([['Protein', p, setP], ['Carbs', c, setC], ['Fat', f, setF]] as const).map(([label, val, set]) => (
                  <View style={styles.macroField} key={label}>
                    <Text style={styles.macroL}>{label}</Text>
                    <TextInput style={styles.macroInput} value={val} onChangeText={set} keyboardType="numeric" placeholder="" placeholderTextColor={colors.mossFaint} selectTextOnFocus />
                  </View>
                ))}
              </View>
              {editing?.barcode ? <Text style={styles.bc}>🏷️ Barcode {editing.barcode}</Text> : null}
              <TouchableOpacity testID="cf-save" style={styles.btn} onPress={save}><Text style={styles.btnTxt}>Save</Text></TouchableOpacity>
              <TouchableOpacity testID="cf-delete" style={styles.del} onPress={() => setConfirmDelete(true)}><Text style={styles.delTxt}>🗑️  Delete this food</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <ConfirmDialog
          visible={confirmDelete}
          title="Delete this food?"
          body="This removes it from My Foods. This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      </SafeAreaView>
    </Modal>
  )
}
