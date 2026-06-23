import React, { useMemo, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import Slider from '@react-native-community/slider'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { MealPrepCycle, FoodItem } from '../types'
import { carriedItem } from '../utils/nutrition'

type Props = {
  visible: boolean
  prevCycle: MealPrepCycle
  onConfirm: (carried: FoodItem[]) => void
  onSkip: () => void
  onClose: () => void
}

const total = (it: FoodItem) => it.kcal * (it.quantity ?? 1)
const leftKcal = (it: FoodItem, left: number) => Math.round(total(it) * (it.weightG ? left / it.weightG : 0))

export default function CarryOverSheet({ visible, prevCycle, onConfirm, onSkip, onClose }: Props) {
  const colors = useColors()
  const items = prevCycle.items
  const [picks, setPicks] = useState(() => items.map((it) => ({ on: false, left: it.weightG })))

  const allOn = items.length > 0 && picks.every((p) => p.on)
  const toggle = (i: number, on: boolean) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, on } : x)))
  const setLeft = (i: number, left: number) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, left } : x)))
  const toggleAll = () => setPicks((p) => p.map((x) => ({ ...x, on: !allOn })))

  const chosen = items.map((it, i) => ({ it, ...picks[i] })).filter((x) => x.on)
  const carriedKcal = chosen.reduce((s, x) => s + leftKcal(x.it, x.left), 0)

  function confirm() {
    onConfirm(chosen.filter((x) => x.left > 0).map((x) => carriedItem(x.it, x.left)))
  }

  const styles = useMemo(() => StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 14 },
    h: { fontFamily: fonts.head, fontSize: 20, color: colors.forest },
    desc: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mossFaint, marginTop: 4, marginBottom: 14, lineHeight: 19 },
    bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    barL: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.moss },
    all: { fontFamily: fonts.display, fontSize: 13, color: colors.matchaDeep },
    row: { borderRadius: 16, backgroundColor: colors.sageBg2, marginBottom: 9, overflow: 'hidden' },
    rowOn: { backgroundColor: colors.sage100 },
    rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
    av: { fontSize: 24 },
    nm: { fontFamily: fonts.display, fontSize: 15, color: colors.forest },
    meta: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: colors.mossFaint, marginTop: 2 },
    check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.mossFaint, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: colors.matcha, borderColor: colors.matcha },
    checkTxt: { color: '#fff', fontSize: 14, fontFamily: fonts.display },
    slid: { paddingHorizontal: 13, paddingBottom: 13 },
    slidTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    slidL: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.moss },
    slidV: { fontFamily: fonts.display, fontSize: 11, color: colors.forest },
    sum: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.forest, borderRadius: 16, padding: 14, marginTop: 6 },
    sumL: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.matchaSoft },
    sumV: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
    btn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 10, backgroundColor: colors.matcha },
    btnTxt: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
    ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line },
    ghostTxt: { fontFamily: fonts.display, fontSize: 14, color: colors.moss },
  }), [colors])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.grab} />
          <Text style={styles.h}>Carry over leftovers?</Text>
          <Text style={styles.desc}>Anything left from your last prep can roll into this one. Tick what's left and set how much.</Text>
          <View style={styles.bar}>
            <Text style={styles.barL}>{chosen.length} of {items.length} selected</Text>
            <TouchableOpacity onPress={toggleAll}><Text style={styles.all}>{allOn ? 'Clear all' : 'Select all'}</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {items.map((it, i) => (
              <View key={i} style={[styles.row, picks[i].on && styles.rowOn]}>
                <TouchableOpacity testID={`carry-toggle-${i}`} style={styles.rowMain} onPress={() => toggle(i, !picks[i].on)}>
                  <Text style={styles.av}>{it.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nm}>{it.name}</Text>
                    <Text style={styles.meta}>{it.weightG} g bought · {total(it).toLocaleString()} kcal</Text>
                  </View>
                  <View style={[styles.check, picks[i].on && styles.checkOn]}><Text style={styles.checkTxt}>{picks[i].on ? '✓' : ''}</Text></View>
                </TouchableOpacity>
                {picks[i].on && (
                  <View style={styles.slid}>
                    <View style={styles.slidTop}>
                      <Text style={styles.slidL}>Amount left to carry</Text>
                      <Text style={styles.slidV}>{Math.round(picks[i].left)} g · {leftKcal(it, picks[i].left).toLocaleString()} kcal</Text>
                    </View>
                    <Slider testID={`carry-slider-${i}`} minimumValue={0} maximumValue={it.weightG || 0} step={5}
                      value={picks[i].left} onValueChange={(v: number) => setLeft(i, v)}
                      minimumTrackTintColor={colors.matcha} maximumTrackTintColor={colors.sage100} thumbTintColor={colors.matcha} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View style={styles.sum}>
            <Text style={styles.sumL}>Carrying over</Text>
            <Text style={styles.sumV}>{chosen.length ? `${chosen.length} item${chosen.length === 1 ? '' : 's'} · ${carriedKcal.toLocaleString()} kcal` : 'Nothing yet'}</Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={confirm}><Text style={styles.btnTxt}>{chosen.length ? 'Start prep with leftovers' : 'Start fresh prep'}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={onSkip}><Text style={styles.ghostTxt}>Start empty — don't carry anything</Text></TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
