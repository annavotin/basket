import React, { useRef, useState, useMemo } from 'react'
import { View, Text, PanResponder, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
}

const TICK_SPACING = 40   // px between each integer value
const TICK_H_FULL = 24    // center tick height
const TICK_H_MIN = 3      // edge minimum height
const COMP_H = 60         // total component height
const NUM_AREA_H = 16     // vertical space below ticks for numbers
const MASK_W = 80         // width of each edge fade mask

// Convex curve: holds high near center, drops sharply toward edges.
function scale(t: number): number {
  return Math.pow(Math.max(0, Math.cos(t * Math.PI * 0.5)), 0.55)
}

export default function DrumPicker({ value, min = 1, max = 14, onChange }: Props) {
  const colors = useColors()
  const [drag, setDrag] = useState(0)
  const [width, setWidth] = useState(320)

  // Stable refs so PanResponder closure never goes stale
  const valueRef = useRef(value)
  valueRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const HALF = width / 2
  const TICK_AREA_H = COMP_H - NUM_AREA_H

  // Which value will land at center when released
  const pending = Math.max(min, Math.min(max, value + Math.round(-drag / TICK_SPACING)))

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4,
    onPanResponderMove: (_e, g) => setDrag(g.dx),
    onPanResponderRelease: (_e, g) => {
      const shift = -Math.round(g.dx / TICK_SPACING)
      const next = Math.max(min, Math.min(max, valueRef.current + shift))
      setDrag(0)
      if (next !== valueRef.current) onChangeRef.current(next)
    },
    onPanResponderTerminate: () => setDrag(0),
  }), [min, max])

  const styles = useMemo(() => StyleSheet.create({
    wrap: { height: COMP_H, overflow: 'hidden' },
    tickWrap: {
      position: 'absolute',
      bottom: NUM_AREA_H,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    tick: { width: 1.5, borderRadius: 1 },
    label: {
      position: 'absolute',
      bottom: 0,
      width: 24,
      textAlign: 'center',
      fontFamily: fonts.num,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    // Two small accent notches that mark the snap point
    notchTop: {
      position: 'absolute',
      top: 0,
      width: 2,
      height: 5,
      borderRadius: 1,
      backgroundColor: colors.matcha,
    },
    notchBottom: {
      position: 'absolute',
      bottom: NUM_AREA_H,
      width: 2,
      height: 5,
      borderRadius: 1,
      backgroundColor: colors.matcha,
    },
  }), [colors, COMP_H, NUM_AREA_H, TICK_AREA_H])

  const ticks = useMemo(() => {
    return Array.from({ length: max - min + 1 }, (_, i) => {
      const v = min + i
      const x = HALF + (v - value) * TICK_SPACING + drag
      if (x < -TICK_SPACING || x > width + TICK_SPACING) return null
      const d = Math.abs(x - HALF)
      const t = Math.min(d / (HALF * 0.82), 1)
      const s = scale(t)
      return { v, x, s, accent: v === pending }
    }).filter(Boolean) as { v: number; x: number; s: number; accent: boolean }[]
  }, [value, drag, HALF, width, min, max, pending])

  // Mask bands: 5 slices per side, opaque→transparent left, transparent→opaque right.
  // Color matches the card background (white).
  const MASK_OPACITIES = [0.72, 0.5, 0.32, 0.16, 0.06]

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      {ticks.map(({ v, x, s, accent }) => {
        const h = TICK_H_MIN + (TICK_H_FULL - TICK_H_MIN) * s
        const tickColor = accent ? colors.matcha : colors.forest
        const tickOpacity = 0.15 + 0.85 * s
        const labelOpacity = Math.max(0, (s - 0.18) / 0.82)
        const labelColor = accent ? colors.matcha : colors.mossFaint
        return (
          <React.Fragment key={v}>
            <View style={[styles.tickWrap, { left: x - 1, height: h, opacity: tickOpacity }]}>
              <View style={[styles.tick, { height: h, backgroundColor: tickColor }]} />
            </View>
            <Text style={[styles.label, { left: x - 12, opacity: labelOpacity, color: labelColor }]}>
              {v}
            </Text>
          </React.Fragment>
        )
      })}

      {/* Snap-point notches */}
      <View style={[styles.notchTop, { left: HALF - 1 }]} />
      <View style={[styles.notchBottom, { left: HALF - 1 }]} />

      {/* Edge fade masks — solid white bands that fade ticks into the card bg */}
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: MASK_W, flexDirection: 'row' }} pointerEvents="none">
        {MASK_OPACITIES.map((op, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.white, opacity: op }} />
        ))}
      </View>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: MASK_W, flexDirection: 'row' }} pointerEvents="none">
        {[...MASK_OPACITIES].reverse().map((op, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.white, opacity: op }} />
        ))}
      </View>
    </View>
  )
}
