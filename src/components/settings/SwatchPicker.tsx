import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'

interface SwatchPickerProps {
  value: [string, string, string]
  options: [string, string, string][]
  onChange: (t: [string, string, string]) => void
  testID?: string
}

export default function SwatchPicker({ value, options, onChange, testID }: SwatchPickerProps) {
  const colors = useColors()
  const styles = React.useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 7,
    },
    swatch: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2.5,
    },
  }), [colors])

  return (
    <View style={styles.row}>
      {options.map((option, index) => {
        const isSelected = value[0] === option[0]
        return (
          <Pressable
            key={index}
            style={[
              styles.swatch,
              {
                backgroundColor: option[1],
                borderColor: isSelected ? colors.forest : 'transparent',
              },
            ]}
            onPress={() => onChange(option)}
            accessibilityState={{ selected: isSelected }}
            testID={testID ? `${testID}-${index}` : undefined}
          />
        )
      })}
    </View>
  )
}
