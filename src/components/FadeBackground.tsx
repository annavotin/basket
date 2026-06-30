import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'

type Props = {
  color: string
  height?: number
  bands?: number
  topOpacity?: number
  /** Power-curve exponent: < 1 holds color longer before fading (0.35 = aggressive). */
  curve?: number
}

/**
 * Dependency-free vertical fade: bands of solid color stepping from `topOpacity`
 * (top) to 0 (bottom) along a power curve. curve < 1 keeps the top dense and
 * fades sharply near the bottom — use ~0.35 for a bold sage wash behind cards.
 */
export default function FadeBackground({ color, height = 380, bands = 16, topOpacity = 1, curve = 0.35 }: Props) {
  const rows = useMemo(() => Array.from({ length: bands }, (_, i) => {
    const t = i / (bands - 1)
    return { key: i, opacity: topOpacity * Math.pow(1 - t, curve) }
  }), [bands, topOpacity, curve])

  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      {rows.map((r) => (
        <View key={r.key} style={[styles.band, { backgroundColor: color, opacity: r.opacity }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  band: { flex: 1 },
})
