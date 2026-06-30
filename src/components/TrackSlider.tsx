import React, { useRef, useMemo, useCallback } from 'react'
import { View, PanResponder, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'

type Props = {
  value: number
  minimumValue: number
  maximumValue: number
  step?: number
  onValueChange: (value: number) => void
  testID?: string
}

const TRACK_H = 10
const THUMB_D = 22
const TRACK_PAD = THUMB_D / 2 + 2  // keeps thumb fully within the track on both ends

export default function TrackSlider({
  value, minimumValue, maximumValue, step = 1, onValueChange, testID,
}: Props) {
  const colors = useColors()
  const containerRef = useRef<View>(null)
  const trackRef = useRef<View>(null)
  const trackPageX = useRef(0)
  const trackWidth = useRef(0)

  const range = maximumValue - minimumValue
  const pct = range > 0 ? Math.max(0, Math.min(1, (value - minimumValue) / range)) : 0

  const snap = useCallback((raw: number) => {
    const clamped = Math.max(minimumValue, Math.min(maximumValue, raw))
    if (step <= 0) return clamped
    return Math.round((clamped - minimumValue) / step) * step + minimumValue
  }, [minimumValue, maximumValue, step])

  // Absolute pageX tracking — no drift, fully stateless each frame.
  const valueFromPageX = useCallback((pageX: number) => {
    const x = Math.max(0, Math.min(trackWidth.current, pageX - trackPageX.current))
    return snap(minimumValue + (x / trackWidth.current) * range)
  }, [snap, minimumValue, range])

  const remeasure = useCallback(() => {
    trackRef.current?.measureInWindow((x) => { trackPageX.current = x })
  }, [])

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      remeasure()
      onValueChange(valueFromPageX(e.nativeEvent.pageX))
    },
    onPanResponderMove: (e) => {
      onValueChange(valueFromPageX(e.nativeEvent.pageX))
    },
  }), [valueFromPageX, onValueChange, remeasure])

  const styles = useMemo(() => StyleSheet.create({
    hit: { paddingVertical: (44 - TRACK_H) / 2, justifyContent: 'center' },
    track: {
      height: TRACK_H,
      borderRadius: TRACK_H / 2,
      marginHorizontal: TRACK_PAD,
      backgroundColor: 'rgba(44,58,30,0.13)',
    },
    fill: {
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      borderRadius: TRACK_H / 2,
      backgroundColor: colors.matcha,
    },
    thumb: {
      position: 'absolute',
      width: THUMB_D, height: THUMB_D,
      borderRadius: THUMB_D / 2,
      backgroundColor: '#fff',
      top: (TRACK_H - THUMB_D) / 2,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
  }), [colors])

  return (
    <View
      ref={containerRef}
      testID={testID}
      style={styles.hit}
      {...pan.panHandlers}
    >
      <View
        ref={trackRef}
        style={styles.track}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width
          remeasure()
        }}
      >
        <View style={[styles.fill, { width: `${pct * 100}%` as any }]} />
        <View style={[styles.thumb, { left: `${pct * 100}%` as any, transform: [{ translateX: -THUMB_D / 2 }] }]} />
      </View>
    </View>
  )
}
