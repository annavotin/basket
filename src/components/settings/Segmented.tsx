import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'

interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedProps {
  value: string
  options: SegmentedOption[]
  onChange: (v: string) => void
  testID?: string
}

export default function Segmented({ value, options, onChange, testID }: SegmentedProps) {
  const colors = useColors()
  const styles = React.useMemo(() => StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.sageBg2,
      borderRadius: 11,
      padding: 3,
      gap: 2,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    buttonActive: {
      backgroundColor: colors.white,
      shadowColor: '#2C3A1E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 1,
    },
    buttonText: {
      fontFamily: fonts.body,
      fontWeight: '700',
      fontSize: 13,
      color: colors.mossFaint,
    },
    buttonTextActive: {
      color: colors.forest,
    },
  }), [colors])

  return (
    <View style={styles.track}>
      {options.map((o) => {
        const isActive = value === o.value
        return (
          <Pressable
            key={o.value}
            style={[styles.button, isActive && styles.buttonActive]}
            onPress={() => onChange(o.value)}
            accessibilityState={{ selected: isActive }}
            testID={testID ? `${testID}-${o.value}` : undefined}
          >
            <Text style={[styles.buttonText, isActive && styles.buttonTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
