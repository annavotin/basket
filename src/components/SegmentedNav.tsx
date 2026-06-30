import React, { useMemo } from 'react'
import { Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { WeeklyTab } from '../types'
import { useColors } from '../styles/ThemeProvider'

type Props = {
  active: WeeklyTab
  onChange: (tab: WeeklyTab) => void
}

const TABS: { key: WeeklyTab; label: string }[] = [
  { key: 'basket', label: 'Batch' },
  { key: 'extras', label: 'Extras' },
  { key: 'pantry', label: 'Pantry' },
]

export default function SegmentedNav({ active, onChange }: Props) {
  const colors = useColors()
  // Light palette uses pure-white surfaces; the dark palette doesn't — use that to pick the
  // blur tint and a matching translucent overlay (the blur alone is too faint for contrast).
  const isDark = colors.white !== '#FFFFFF'

  const styles = useMemo(() => StyleSheet.create({
    pill: {
      flexDirection: 'row',
      borderRadius: 28,
      padding: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.13)',
      backgroundColor: 'rgba(28,36,23,0.88)',
      height: 56,
      alignItems: 'center',
    },
    segment: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: { backgroundColor: 'rgba(255,255,255,0.16)' },
    label: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
    labelActive: { color: '#FFFFFF' },
  }), [colors])

  return (
    <BlurView intensity={48} tint="dark" style={styles.pill} testID="segmented-nav">
      {TABS.map((t) => {
        const isActive = t.key === active
        return (
          <TouchableOpacity
            key={t.key}
            testID={`tab-${t.key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </TouchableOpacity>
        )
      })}
    </BlurView>
  )
}
