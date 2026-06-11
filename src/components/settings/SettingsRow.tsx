import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'
import Chevron from './Chevron'

interface SettingsRowProps {
  icon?: string
  label: string
  sub?: string
  value?: string
  chevron?: boolean
  onPress?: () => void
  danger?: boolean
  disabled?: boolean
  badge?: string
  right?: React.ReactNode
  testID?: string
}

export default function SettingsRow({
  icon,
  label,
  sub,
  value,
  chevron,
  onPress,
  danger,
  disabled,
  badge,
  right,
  testID,
}: SettingsRowProps) {
  const colors = useColors()
  const styles = React.useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 15,
      paddingVertical: 13,
      minHeight: 54,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    iconTile: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.sageBg2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      fontSize: 16,
    },
    main: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'column',
      gap: 2,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontFamily: fonts.body,
      fontWeight: '700',
      fontSize: 15,
      color: colors.forest,
    },
    labelDanger: {
      color: colors.roseDeep,
    },
    sub: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mossFaint,
    },
    badge: {
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: colors.pantry,
      backgroundColor: colors.pantry + '22',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    value: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mossFaint,
    },
  }), [colors])

  const rowContent = (
    <>
      {icon && (
        <View style={styles.iconTile}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      )}
      <View style={styles.main}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
          {badge && <Text style={styles.badge}>{badge}</Text>}
        </View>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <View style={styles.right}>
        {right != null
          ? right
          : (
            <>
              {value != null && <Text style={styles.value}>{value}</Text>}
              {chevron && <Chevron />}
            </>
          )
        }
      </View>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        style={[styles.row, disabled && styles.rowDisabled]}
        onPress={disabled ? undefined : onPress}
        accessibilityRole="button"
        disabled={disabled}
        testID={testID}
      >
        {rowContent}
      </Pressable>
    )
  }

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]} testID={testID}>
      {rowContent}
    </View>
  )
}
