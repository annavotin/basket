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
  { key: 'basket', label: 'Basket' },
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
      borderRadius: 26,
      padding: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)',
      backgroundColor: isDark ? 'rgba(40,48,33,0.45)' : 'rgba(255,255,255,0.4)',
    },
    segment: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: { backgroundColor: colors.navSegmentActive },
    label: { fontSize: 15, fontWeight: '600', color: colors.forest, opacity: 0.65 },
    labelActive: { color: colors.selectedDayText, opacity: 1 },
  }), [colors, isDark])

  return (
    <BlurView intensity={isDark ? 40 : 28} tint={isDark ? 'dark' : 'light'} style={styles.pill} testID="segmented-nav">
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
