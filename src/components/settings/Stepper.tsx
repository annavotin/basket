import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'
import { PlusIcon, MinusIcon } from '../icons'

interface StepperProps {
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (n: number) => void
  testID?: string
}

export default function Stepper({
  value,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  suffix,
  onChange,
  testID,
}: StepperProps) {
  const colors = useColors()
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.sageBg2,
      borderRadius: 11,
      padding: 3,
    },
    button: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#2C3A1E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    valueContainer: {
      minWidth: 62,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    value: {
      fontFamily: fonts.num,
      fontWeight: '600',
      fontSize: 14,
      color: colors.forest,
    },
    suffix: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mossFaint,
      fontFamily: fonts.body,
    },
  }), [colors])

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        style={styles.button}
        onPress={() => onChange(Math.max(min, value - step))}
        testID={testID ? `${testID}-dec` : undefined}
      >
        <MinusIcon size={18} color={colors.forest} strokeWidth={2.6} />
      </Pressable>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      <Pressable
        style={styles.button}
        onPress={() => onChange(Math.min(max, value + step))}
        testID={testID ? `${testID}-inc` : undefined}
      >
        <PlusIcon size={18} color={colors.forest} strokeWidth={2.6} />
      </Pressable>
    </View>
  )
}
