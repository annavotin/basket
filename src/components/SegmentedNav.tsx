import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { WeeklyTab } from '../types'
import { colors } from '../styles/colors'

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
  return (
    <View style={styles.pill} testID="segmented-nav">
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
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    backgroundColor: colors.navTrack,
    borderRadius: 26,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.navSegmentActive },
  label: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', opacity: 0.75 },
  labelActive: { opacity: 1 },
})
