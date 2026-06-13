import React, { useMemo, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { MealPrepCycle, PantryItem, ExtraMeal, MacroTargets } from '../types'
import {
  totalKcal, cycleBudget, pantryKcalForCycle, extrasKcalInRange,
  kcalDerivedMacros, ringArcs, itemSharePct, aggregateMacros,
} from '../utils/nutrition'
import { daysBetween, formatDay } from '../utils/dates'

const SRC_LABEL: Record<string, string> = { barcode: 'Scanned', receipt: 'Receipt', manual: 'Manual', carry: 'Carried over' }
const R = 60
const CIRC = 2 * Math.PI * R
const MAX_PREP_DAYS = 14
// Translucent macro-bar track tints (rose / amber / matcha), straight from the design CSS.
const MACRO_TRACK = { protein: 'rgba(180,92,124,.18)', carbs: 'rgba(230,162,60,.20)', fat: 'rgba(124,201,110,.22)' }

type Props = {
  visible: boolean
  cycle: MealPrepCycle
  pantry: PantryItem[]
  extras: ExtraMeal[]
  dailyGoal: number
  macroTargets: MacroTargets
  onBack: () => void
  onAddItem: () => void
  onScanReceipt: () => void
  onSetDays: (days: number) => void
  onDeleteCycle: () => void
  onItemPress: (index: number) => void
}

export default function BasketPage({
  visible, cycle, pantry, extras, dailyGoal, macroTargets,
  onBack, onAddItem, onScanReceipt, onSetDays, onDeleteCycle, onItemPress,
}: Props) {
  const colors = useColors()
  const [menu, setMenu] = useState(false)

  const days = daysBetween(cycle.startDate, cycle.endDate) + 1
  const mealPrep = totalKcal(cycle.items)
  const pan = pantryKcalForCycle(pantry, cycle, days)
  const ext = extrasKcalInRange(extras, cycle.startDate, cycle.endDate)
  const consumed = mealPrep + pan + ext
  const budget = cycleBudget(days, dailyGoal)
  const weight = cycle.items.reduce((s, i) => s + (i.weightG || 0), 0)
  const a = formatDay(cycle.startDate)
  const b = formatDay(cycle.endDate)
  const rangeLabel = `${a.day} ${a.month} – ${b.day} ${b.month} · ${days} days`

  const arcs = ringArcs([mealPrep, pan, ext], budget)
  const arcColors = [colors.matcha, colors.pantry, colors.rose]
  const pct = (v: number) => (budget > 0 ? Math.max(0, Math.min(100, (v / budget) * 100)) : 0)
  const macro = aggregateMacros(cycle.items, pan + ext)
  const macroDefs = [
    { label: 'Protein', got: macro.protein, target: macroTargets.protein * days, color: colors.roseDeep, track: MACRO_TRACK.protein },
    { label: 'Carbs', got: macro.carbs, target: macroTargets.carbs * days, color: colors.pantry, track: MACRO_TRACK.carbs },
    { label: 'Fat', got: macro.fat, target: macroTargets.fat * days, color: colors.matchaDeep, track: MACRO_TRACK.fat },
  ]

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.sageBg },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
    backTxt: { fontSize: 22, color: colors.forest, lineHeight: 24 },
    ttl: { flex: 1, minWidth: 0 },
    ttlK: { fontFamily: fonts.head, fontSize: 19, color: colors.forest },
    ttlS: { fontFamily: fonts.body, fontSize: 12, color: colors.moss, marginTop: 2 },
    menuBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    menuDots: { fontSize: 22, color: colors.moss, lineHeight: 22 },
    scroll: { paddingHorizontal: 16, paddingBottom: 120 },
    hero: { borderRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, backgroundColor: colors.sageBg2, alignItems: 'center' },
    ring: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center' },
    ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    ringK: { fontFamily: fonts.display, fontSize: 34, color: colors.forest },
    ringL: { fontFamily: fonts.bodyExtra, fontSize: 11, color: colors.mossFaint, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
    fill: { width: '100%', marginTop: 18 },
    srcbar: { flexDirection: 'row', height: 10, borderRadius: 6, backgroundColor: colors.sage100, overflow: 'hidden', gap: 2 },
    srcleg: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
    legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legDot: { width: 8, height: 8, borderRadius: 3 },
    legTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.mossFaint },
    legVal: { fontFamily: fonts.display, fontSize: 13, color: colors.forest },
    macros: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 13, borderTopWidth: 1.5, borderTopColor: colors.line },
    macro: { flex: 1 },
    macroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    macroL: { fontFamily: fonts.bodyExtra, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.3, color: colors.moss },
    macroV: { fontFamily: fonts.display, fontSize: 12, color: colors.forest },
    macroBar: { height: 6, borderRadius: 4, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 4 },
    stats: { flexDirection: 'row', gap: 9, marginTop: 12 },
    stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 13, alignItems: 'center' },
    statV: { fontFamily: fonts.display, fontSize: 21, color: colors.forest },
    statL: { fontFamily: fonts.body, fontSize: 11, color: colors.mossFaint, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
    seclbl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, paddingTop: 20, paddingBottom: 11 },
    seclblK: { fontFamily: fonts.head, fontSize: 16, color: colors.forest },
    seccnt: { fontFamily: fonts.body, fontSize: 12, color: colors.mossFaint },
    items: { gap: 10 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 },
    av: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center' },
    avTxt: { fontSize: 25 },
    itMid: { flex: 1, minWidth: 0 },
    itNm: { fontFamily: fonts.display, fontSize: 16, color: colors.forest },
    itMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    tag: { backgroundColor: colors.sage100, color: colors.moss, fontFamily: fonts.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, overflow: 'hidden' },
    metaTxt: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: colors.mossFaint },
    itBar: { height: 5, borderRadius: 4, backgroundColor: colors.sageBg2, overflow: 'hidden', marginTop: 8 },
    itBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.matchaSoft },
    itKc: { width: 50, alignItems: 'flex-end' },
    itKcV: { fontFamily: fonts.display, fontSize: 15, color: colors.matchaDeep },
    itKcL: { fontFamily: fonts.body, fontSize: 9, color: colors.mossFaint },
    empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 30 },
    emptyE: { fontSize: 46, marginBottom: 12 },
    emptyH: { fontFamily: fonts.head, fontSize: 18, color: colors.forest, marginBottom: 5 },
    emptyP: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.moss, textAlign: 'center', lineHeight: 20 },
    scan: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14, backgroundColor: colors.forest, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
    scanIc: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
    scanIcTxt: { fontSize: 21 },
    scanTx: { flex: 1 },
    scanB: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
    scanS: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.matchaSoft, marginTop: 1 },
    scanGo: { fontSize: 24, color: 'rgba(255,255,255,.6)' },
    cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 26, backgroundColor: colors.sageBg },
    addBtn: { borderRadius: 18, paddingVertical: 16, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addTxt: { fontFamily: fonts.display, fontSize: 16, color: '#fff' },
    scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,36,23,.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.sage100, alignSelf: 'center', marginBottom: 14 },
    sheetH: { fontFamily: fonts.head, fontSize: 20, color: colors.forest },
    sheetDesc: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mossFaint, marginTop: 2, marginBottom: 14 },
    lenTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    lenL: { fontFamily: fonts.display, fontSize: 14, color: colors.forest },
    lenV: { fontFamily: fonts.display, fontSize: 24, color: colors.matchaDeep },
    lenRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
    lenStep: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.sageBg2, alignItems: 'center' },
    lenStepTxt: { fontFamily: fonts.display, fontSize: 18, color: colors.forest },
    lenFoot: { fontFamily: fonts.body, fontSize: 12, color: colors.moss, textAlign: 'center', marginTop: 10, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: colors.line },
    del: { marginTop: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(180,92,124,.12)', alignItems: 'center' },
    delTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.roseDeep },
  }), [colors])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} transparent={false}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.top}>
          <TouchableOpacity style={styles.back} onPress={onBack} accessibilityLabel="Back">
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={styles.ttl}>
            <Text style={styles.ttlK}>Meal Prep</Text>
            <Text style={styles.ttlS} numberOfLines={1}>{rangeLabel}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenu(true)} accessibilityLabel="More">
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.ring}>
              <Svg width={148} height={148} viewBox="0 0 148 148">
                <Circle cx={74} cy={74} r={R} stroke={colors.sage100} strokeWidth={13} fill="none" />
                {arcs.map((arc, i) => arc.fraction > 0 ? (
                  <Circle key={i} cx={74} cy={74} r={R} stroke={arcColors[i]} strokeWidth={13} fill="none"
                    strokeDasharray={`${arc.fraction * CIRC} ${CIRC}`}
                    rotation={-90 + arc.offset * 360} originX={74} originY={74} />
                ) : null)}
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.ringK}>{consumed.toLocaleString()}</Text>
                <Text style={styles.ringL}>of {budget.toLocaleString()} kcal</Text>
              </View>
            </View>

            <View style={styles.fill}>
              <View style={styles.srcbar}>
                <View style={{ width: `${pct(mealPrep)}%`, backgroundColor: colors.matcha }} />
                <View style={{ width: `${pct(pan)}%`, backgroundColor: colors.pantry }} />
                <View style={{ width: `${pct(ext)}%`, backgroundColor: colors.rose }} />
              </View>
              <View style={styles.srcleg}>
                {[['Meal prep', colors.matcha, mealPrep], ['Pantry', colors.pantry, pan], ['Extras', colors.rose, ext]].map(([label, c, v]) => (
                  <View style={styles.legItem} key={label as string}>
                    <View style={[styles.legDot, { backgroundColor: c as string }]} />
                    <Text style={styles.legTxt}>{label} <Text style={styles.legVal}>{(v as number).toLocaleString()}</Text></Text>
                  </View>
                ))}
              </View>
              <View style={styles.macros}>
                {macroDefs.map((m) => {
                  const p = Math.max(0, Math.min(100, (m.got / Math.max(1, m.target)) * 100))
                  return (
                    <View style={styles.macro} key={m.label}>
                      <View style={styles.macroTop}>
                        <Text style={styles.macroL}>{m.label}</Text>
                        <Text style={styles.macroV}>{m.got}<Text style={{ color: colors.mossFaint }}>/{Math.round(m.target)}g</Text></Text>
                      </View>
                      <View style={[styles.macroBar, { backgroundColor: m.track }]}>
                        <View style={[styles.macroFill, { width: `${p}%`, backgroundColor: m.color }]} />
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {cycle.items.length > 0 ? (
            <>
              <View style={styles.stats}>
                <View style={styles.stat}><Text style={styles.statV}>{cycle.items.length}</Text><Text style={styles.statL}>items</Text></View>
                <View style={styles.stat}><Text style={styles.statV}>{(weight / 1000).toFixed(weight >= 1000 ? 1 : 2)}kg</Text><Text style={styles.statL}>total weight</Text></View>
                <View style={styles.stat}><Text style={styles.statV}>{days ? Math.round(mealPrep / days).toLocaleString() : 0}</Text><Text style={styles.statL}>kcal / day</Text></View>
              </View>

              <View style={styles.seclbl}>
                <Text style={styles.seclblK}>Receipt</Text>
                <Text style={styles.seccnt}>{cycle.items.length} item{cycle.items.length === 1 ? '' : 's'}</Text>
              </View>

              <View style={styles.items}>
                {/* FoodItem has no stable id yet; index keys are fine here because the
                    list isn't reordered and onItemPress feeds the index straight to the
                    edit-by-index handler. Revisit if items gain ids / reordering. */}
                {cycle.items.map((it, idx) => {
                  // Quantity multiplies calories only — match the ring's totalKcal so the
                  // card's kcal, /day, and share bar stay consistent with the hero total.
                  const itemKcal = it.kcal * (it.quantity ?? 1)
                  return (
                  <TouchableOpacity style={styles.item} key={idx} onPress={() => onItemPress(idx)} activeOpacity={0.7}
                    accessibilityRole="button" accessibilityLabel={`${it.name}, ${itemKcal} kcal, edit`}>
                    <View style={styles.av}><Text style={styles.avTxt}>{it.emoji}</Text></View>
                    <View style={styles.itMid}>
                      <Text style={styles.itNm} numberOfLines={1}>{it.name}</Text>
                      <View style={styles.itMeta}>
                        <Text style={styles.tag}>{SRC_LABEL[it.source || 'manual']}</Text>
                        <Text style={styles.metaTxt}>{it.weightG} g · {days ? Math.round(itemKcal / days) : itemKcal}/day</Text>
                      </View>
                      <View style={styles.itBar}><View style={[styles.itBarFill, { width: `${itemSharePct(itemKcal, mealPrep)}%` }]} /></View>
                    </View>
                    <View style={styles.itKc}><Text style={styles.itKcV}>{itemKcal.toLocaleString()}</Text><Text style={styles.itKcL}>KCAL</Text></View>
                  </TouchableOpacity>
                  )
                })}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyE}>🧺</Text>
              <Text style={styles.emptyH}>Basket's empty</Text>
              <Text style={styles.emptyP}>Scan your receipt to add a whole shop at once — or add items one by one.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.scan} onPress={onScanReceipt} activeOpacity={0.85}>
            <View style={styles.scanIc}><Text style={styles.scanIcTxt}>🧾</Text></View>
            <View style={styles.scanTx}><Text style={styles.scanB}>Scan a receipt</Text><Text style={styles.scanS}>Add a whole shop in one tap</Text></View>
            <Text style={styles.scanGo}>›</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.cta}>
          <TouchableOpacity style={styles.addBtn} onPress={onAddItem} activeOpacity={0.9}>
            <Text style={styles.addTxt}>＋ Add to basket</Text>
          </TouchableOpacity>
        </View>

        {/* Nested Modal for the ⋮ sheet. onRequestClose keeps Android's hardware-back
            in sync with `menu` state. If nested-Modal quirks surface on Android, switch
            this to an absolutely-positioned overlay in the same tree. */}
        <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
          <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setMenu(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
              <View style={styles.grab} />
              <Text style={styles.sheetH}>Meal Prep</Text>
              <Text style={styles.sheetDesc}>{rangeLabel}</Text>
              <View style={styles.lenTop}>
                <Text style={styles.lenL}>Prep length</Text>
                <Text style={styles.lenV}>{days} <Text style={{ fontSize: 13, color: colors.mossFaint }}>day{days === 1 ? '' : 's'}</Text></Text>
              </View>
              <View style={styles.lenRow}>
                <TouchableOpacity style={styles.lenStep} onPress={() => onSetDays(Math.max(1, days - 1))}><Text style={styles.lenStepTxt}>−</Text></TouchableOpacity>
                <TouchableOpacity style={styles.lenStep} onPress={() => onSetDays(Math.min(MAX_PREP_DAYS, days + 1))}><Text style={styles.lenStepTxt}>＋</Text></TouchableOpacity>
              </View>
              <Text style={styles.lenFoot}>{a.day} {a.month} → {b.day} {b.month} · {(days * dailyGoal).toLocaleString()} kcal budget</Text>
              <TouchableOpacity style={styles.del} onPress={() => { setMenu(false); onDeleteCycle() }}>
                <Text style={styles.delTxt}>🗑️  Delete this basket</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  )
}
