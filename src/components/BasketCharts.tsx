import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Macros, MacroTargets } from '../types'
import { ringArcs } from '../utils/nutrition'

const R = 56
const CIRC = 2 * Math.PI * R
// Translucent macro-bar track tints (rose / amber / matcha), from the design CSS.
const MACRO_TRACK = { protein: 'rgba(180,92,124,.18)', carbs: 'rgba(230,162,60,.20)', fat: 'rgba(124,201,110,.22)' }

type Props = {
  consumed: number
  budget: number
  mealPrep: number
  pantry: number
  extra: number
  macros: Macros
  macroTargets: MacroTargets
  days: number
  itemCount: number
  totalWeightG: number
}

/**
 * The basket "hero" charts — a calorie ring, a source breakdown bar, macro bars, and a row
 * of stat cards. Shown at the top of the expanded full-basket view. Pure presentation; the
 * caller passes already-aggregated totals.
 */
export default function BasketCharts({
  consumed, budget, mealPrep, pantry, extra, macros, macroTargets, days, itemCount, totalWeightG,
}: Props) {
  const colors = useColors()
  const arcs = ringArcs([mealPrep, pantry, extra], budget)
  const arcColors = [colors.matcha, colors.pantry, colors.rose]
  const pct = (v: number) => (budget > 0 ? Math.max(0, Math.min(100, (v / budget) * 100)) : 0)
  const macroDefs = [
    { label: 'Protein', got: macros.protein, target: macroTargets.protein * days, color: colors.roseDeep, track: MACRO_TRACK.protein },
    { label: 'Carbs', got: macros.carbs, target: macroTargets.carbs * days, color: colors.pantry, track: MACRO_TRACK.carbs },
    { label: 'Fat', got: macros.fat, target: macroTargets.fat * days, color: colors.matchaDeep, track: MACRO_TRACK.fat },
  ]

  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: colors.white, borderRadius: 24, padding: 18, alignItems: 'center', marginBottom: 10 },
    ring: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
    ringCenter: { position: 'absolute', alignItems: 'center' },
    ringK: { fontFamily: fonts.display, fontSize: 30, color: colors.forest },
    ringL: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mossFaint, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
    fill: { width: '100%', marginTop: 16 },
    srcbar: { flexDirection: 'row', height: 10, borderRadius: 6, backgroundColor: colors.sage100, overflow: 'hidden', gap: 2 },
    srcleg: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legDot: { width: 8, height: 8, borderRadius: 3 },
    legTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.mossFaint },
    legVal: { fontFamily: fonts.display, fontSize: 12.5, color: colors.forest },
    macros: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 13, borderTopWidth: 1.5, borderTopColor: colors.line, width: '100%' },
    macro: { flex: 1 },
    macroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    macroL: { fontFamily: fonts.body, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.3, color: colors.moss },
    macroV: { fontFamily: fonts.display, fontSize: 12, color: colors.forest },
    macroBar: { height: 6, borderRadius: 4, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 4 },
    stats: { flexDirection: 'row', gap: 9, marginBottom: 12 },
    stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 13, alignItems: 'center' },
    statV: { fontFamily: fonts.display, fontSize: 20, color: colors.forest },
    statL: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mossFaint, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
  }), [colors])

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.ring}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Circle cx={70} cy={70} r={R} stroke={colors.sage100} strokeWidth={12} fill="none" />
            {arcs.map((arc, i) => arc.fraction > 0 ? (
              <Circle
                key={i} cx={70} cy={70} r={R} stroke={arcColors[i]} strokeWidth={12} fill="none"
                strokeDasharray={`${arc.fraction * CIRC} ${CIRC}`}
                rotation={-90 + arc.offset * 360} originX={70} originY={70}
              />
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
            <View style={{ width: `${pct(pantry)}%`, backgroundColor: colors.pantry }} />
            <View style={{ width: `${pct(extra)}%`, backgroundColor: colors.rose }} />
          </View>
          <View style={styles.srcleg}>
            {([['Meal prep', colors.matcha, mealPrep], ['Pantry', colors.pantry, pantry], ['Extras', colors.rose, extra]] as const).map(([label, c, v]) => (
              <View style={styles.legItem} key={label}>
                <View style={[styles.legDot, { backgroundColor: c }]} />
                <Text style={styles.legTxt}>{label} <Text style={styles.legVal}>{v.toLocaleString()}</Text></Text>
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
                    <Text style={styles.macroV}>{Math.round(m.got)}<Text style={{ color: colors.mossFaint }}>/{Math.round(m.target)}g</Text></Text>
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
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statV}>{itemCount}</Text><Text style={styles.statL}>items</Text></View>
        <View style={styles.stat}><Text style={styles.statV}>{(totalWeightG / 1000).toFixed(totalWeightG >= 1000 ? 1 : 2)}kg</Text><Text style={styles.statL}>weight</Text></View>
        <View style={styles.stat}><Text style={styles.statV}>{days ? Math.round(mealPrep / days).toLocaleString() : 0}</Text><Text style={styles.statL}>kcal / day</Text></View>
      </View>
    </View>
  )
}
