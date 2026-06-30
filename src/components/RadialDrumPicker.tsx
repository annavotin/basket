import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text, PanResponder, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  onPreviewChange?: (days: number) => void
  height?: number
  /** Override the disc/wrap background (defaults to colors.white). */
  discColor?: string
  /** When disc is dark, flip ticks and labels to white so they remain readable. */
  onDark?: boolean
  /** Custom label text for a tick value. If provided, only ticks where isMajor returns true are labelled. */
  formatLabel?: (v: number) => string
  /** If provided, only ticks returning true get a full-size pip + label. Others get a small minor pip. */
  isMajor?: (v: number) => boolean
  /** Angular step per integer value (radians). Smaller = ticks packed tighter, less cosine distortion. Default 0.20. */
  aStep?: number
}

const A_STEP = 0.20
const TICK_L_FULL = 22
const TICK_L_MIN = 6
const TICK_W = 1.5
const NUM_INSET = 22

// Flick physics (all in value-units, time in seconds).
const DECEL = 4.5            // exponential friction during a free fling
const SNAP_VEL = 1.4         // below this speed, stop flinging and spring to the nearest tick
const SNAP_K = 190           // snap spring stiffness; paired with critical damping (no overshoot)
const BOUND_K = 260          // rubber-band stiffness when past an end (a touch springier)
const MAX_VEL = 50           // clamp release velocity so a hard flick can't rocket off
const DRAG_RUBBER = 0.35     // how far past an end a finger-drag is allowed to stretch

function curve(t: number): number {
  return Math.pow(Math.max(0, Math.cos(t * Math.PI * 0.5)), 0.55)
}

export default function RadialDrumPicker({ value, min = 1, max = 14, onChange, onPreviewChange, height = 160, discColor, onDark, formatLabel, isMajor, aStep: aStepProp = A_STEP }: Props) {
  const colors = useColors()
  // Continuous wheel position (can be fractional mid-spin and slightly past an end while rubber-banding).
  const [pos, setPos] = useState(value)
  const [cw, setCW] = useState(320)

  const R = cw * 0.54
  const HALF = cw / 2
  // Small BELOW → disc centre just below the component bottom → ticks appear near the top of the frame.
  const BELOW = height * 0.04
  const CY = height + BELOW

  // Refs so the (memoised-once) gesture handlers and the rAF loop always read fresh values.
  const RRef = useRef(R); RRef.current = R
  const aStepRef = useRef(aStepProp); aStepRef.current = aStepProp
  const minRef = useRef(min); minRef.current = min
  const maxRef = useRef(max); maxRef.current = max
  const valueRef = useRef(value); valueRef.current = value
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange
  const onPreviewRef = useRef(onPreviewChange); onPreviewRef.current = onPreviewChange

  const posRef = useRef(value)
  const velRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const grabPosRef = useRef(value)
  const lastIntRef = useRef(value)   // last settled-on integer, for per-tick haptics + preview

  const clampToBounds = useCallback((v: number) => Math.max(minRef.current, Math.min(maxRef.current, v)), [])

  // Commit a new continuous position: re-render, and fire a haptic tick + preview when we cross an integer.
  const applyPos = useCallback((p: number) => {
    posRef.current = p
    setPos(p)
    const i = clampToBounds(Math.round(p))
    if (i !== lastIntRef.current) {
      lastIntRef.current = i
      Haptics.selectionAsync()
      onPreviewRef.current?.(i)
    }
  }, [clampToBounds])

  const stopAnim = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startMomentum = useCallback(() => {
    const SNAP_C = 2 * Math.sqrt(SNAP_K)
    const BOUND_C = 2 * Math.sqrt(BOUND_K)
    lastTsRef.current = null

    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      let dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      if (dt > 0.032) dt = 0.032   // clamp long frame gaps so a stall can't teleport the wheel

      const lo = minRef.current
      const hi = maxRef.current
      let p = posRef.current
      let v = velRef.current

      if (p < lo || p > hi) {
        // Past an end → spring back to it; the incoming velocity gives a soft bounce, then it settles.
        const target = p < lo ? lo : hi
        v += (-BOUND_K * (p - target) - BOUND_C * v) * dt
        p += v * dt
        if (Math.abs(p - target) < 0.002 && Math.abs(v) < 0.02) { p = target; v = 0 }
      } else if (Math.abs(v) > SNAP_VEL) {
        // Free fling, decelerating.
        v *= Math.exp(-DECEL * dt)
        p += v * dt
      } else {
        // Slow enough → critically-damped spring onto the nearest tick.
        const target = clampToBounds(Math.round(p))
        v += (-SNAP_K * (p - target) - SNAP_C * v) * dt
        p += v * dt
        if (Math.abs(p - target) < 0.001 && Math.abs(v) < 0.01) { p = target; v = 0 }
      }

      velRef.current = v
      applyPos(p)

      if (v === 0) {
        rafRef.current = null
        const final = clampToBounds(Math.round(p))
        if (final !== valueRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onChangeRef.current(final)
        }
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }

    stopAnim()
    rafRef.current = requestAnimationFrame(step)
  }, [applyPos, clampToBounds, stopAnim])

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    // Capture horizontal gestures so the parent vertical ScrollView never fights us.
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
    onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      stopAnim()
      draggingRef.current = true
      velRef.current = 0
      grabPosRef.current = posRef.current
    },
    onPanResponderMove: (_e, g) => {
      const lo = minRef.current
      const hi = maxRef.current
      const raw = grabPosRef.current - g.dx / (RRef.current * aStepRef.current)
      // Resist (rubber-band) once dragged past either end.
      let p = raw
      if (raw < lo) p = lo - (lo - raw) * DRAG_RUBBER
      else if (raw > hi) p = hi + (raw - hi) * DRAG_RUBBER
      applyPos(p)
    },
    onPanResponderRelease: (_e, g) => {
      draggingRef.current = false
      // gestureState.vx is px/ms; convert to value/sec (sign matches pos = grab - dx/…).
      let v = -(g.vx * 1000) / (RRef.current * aStepRef.current)
      velRef.current = Math.max(-MAX_VEL, Math.min(MAX_VEL, v))
      startMomentum()
    },
    onPanResponderTerminate: () => {
      draggingRef.current = false
      velRef.current = 0
      startMomentum()   // no fling — just spring to the nearest tick / back from an end
    },
  // Handlers read everything through refs, so this never needs to be rebuilt mid-gesture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Reflect external value changes (e.g. a programmatic reset) only while the wheel is idle.
  useEffect(() => {
    if (!draggingRef.current && rafRef.current == null) {
      posRef.current = value
      lastIntRef.current = value
      setPos(value)
    }
  }, [value])

  // Cancel any in-flight animation on unmount.
  useEffect(() => stopAnim, [stopAnim])

  const pending = clampToBounds(Math.round(pos))

  const ticks = useMemo(() => {
    const maxPos = Math.ceil((Math.PI * 0.55) / aStepProp)
    return Array.from({ length: max - min + 1 }, (_, i) => {
      const v = min + i
      if (Math.abs(v - pos) > maxPos) return null
      const major = isMajor ? isMajor(v) : true
      const θ = (v - pos) * aStepProp
      const oy = CY - R * Math.cos(θ)
      if (oy > height + 4) return null
      const t = Math.min(Math.abs(θ) / (aStepProp * 6.5), 1)
      const s = curve(t)
      const lFull = major ? TICK_L_FULL : TICK_L_FULL * 0.45
      const lMin  = major ? TICK_L_MIN  : TICK_L_MIN  * 0.6
      const L = lMin + (lFull - lMin) * s
      const cx = HALF + (R - L * 0.5) * Math.sin(θ)
      const cy = CY - (R - L * 0.5) * Math.cos(θ)
      const nx = HALF + (R - L - NUM_INSET) * Math.sin(θ)
      const ny = CY - (R - L - NUM_INSET) * Math.cos(θ)
      return { v, θ, cx, cy, nx, ny, L, s, accent: v === pending, major }
    }).filter(Boolean) as Array<{
      v: number; θ: number; cx: number; cy: number
      nx: number; ny: number; L: number; s: number; accent: boolean; major: boolean
    }>
  }, [pos, R, HALF, CY, min, max, pending, height, isMajor, aStepProp])

  const rimY = CY - R
  const needleTop = 4
  const needleH = Math.max(0, rimY - needleTop)

  const styles = useMemo(() => StyleSheet.create({
    wrap: { height, overflow: 'hidden', backgroundColor: discColor ?? 'transparent' },
    disc: {
      position: 'absolute',
      borderRadius: R,
      backgroundColor: discColor ?? colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      shadowColor: '#2C3A1E',
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -6 },
      elevation: 4,
    },
    tick: { position: 'absolute', width: TICK_W, borderRadius: 1 },
    numLabel: {
      position: 'absolute',
      fontFamily: fonts.num,
      fontWeight: '700',
      fontSize: 9.5,
      letterSpacing: 0.2,
      textAlign: 'center',
      width: 40,
    },
    needle: {
      position: 'absolute',
      width: 2,
      borderRadius: 1,
      backgroundColor: colors.matcha,
    },
    needleHub: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.matcha,
    },
  }), [colors, R, height, discColor, onDark])

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setCW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <View style={[styles.disc, { width: R * 2, height: R * 2, left: HALF - R, top: CY - R }]} />

      {ticks.map(({ v, θ, cx, cy, nx, ny, L, s, accent, major }) => {
        const label = formatLabel ? formatLabel(v) : String(v)
        const showLabel = major && s > 0.25
        return (
          <React.Fragment key={v}>
            <View style={[styles.tick, {
              left: cx - TICK_W / 2,
              top: cy - L / 2,
              height: L,
              backgroundColor: onDark ? 'rgba(255,255,255,0.9)' : (accent ? colors.matcha : colors.forest),
              opacity: 0.15 + 0.85 * s,
              transform: [{ rotate: `${θ * (180 / Math.PI)}deg` }],
            }]} />
            {showLabel && (
              <Text style={[styles.numLabel, {
                left: nx - 20,
                top: ny - 7,
                opacity: Math.max(0, (s - 0.25) / 0.75),
                color: onDark ? 'rgba(255,255,255,0.8)' : (accent ? colors.matcha : colors.mossFaint),
              }]}>
                {label}
              </Text>
            )}
          </React.Fragment>
        )
      })}

      {needleH > 0 && <>
        <View style={[styles.needle, { left: HALF - 1, top: needleTop, height: needleH }]} />
        <View style={[styles.needleHub, { left: HALF - 4, top: rimY - 4 }]} />
      </>}
    </View>
  )
}
