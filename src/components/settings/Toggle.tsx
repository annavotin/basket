import React from 'react'
import { Pressable, View, StyleSheet, Animated } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'

interface ToggleProps {
  value: boolean
  onValueChange: (v: boolean) => void
  testID?: string
}

export default function Toggle({ value, onValueChange, testID }: ToggleProps) {
  const colors = useColors()
  const styles = React.useMemo(() => StyleSheet.create({
    track: {
      width: 48,
      height: 28,
      borderRadius: 16,
      padding: 3,
      justifyContent: 'center',
    },
    knob: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
  }), [colors])

  return (
    <Pressable
      style={[styles.track, { backgroundColor: value ? colors.matcha : colors.sage100 }]}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      testID={testID}
    >
      <View
        style={[
          styles.knob,
          { transform: [{ translateX: value ? 20 : 0 }] },
        ]}
      />
    </Pressable>
  )
}
