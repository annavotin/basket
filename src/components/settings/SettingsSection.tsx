import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'

interface SettingsSectionProps {
  label: string
  hint?: string
  children: React.ReactNode
}

export default function SettingsSection({ label, hint, children }: SettingsSectionProps) {
  const colors = useColors()
  const styles = React.useMemo(() => StyleSheet.create({
    section: {
      marginTop: 22,
    },
    label: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.mossFaint,
      paddingHorizontal: 6,
      paddingBottom: 9,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#2C3A1E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 9,
      elevation: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.line,
      marginLeft: 57,
    },
    hint: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.moss,
      paddingHorizontal: 8,
      paddingTop: 9,
      lineHeight: 11.5 * 1.45,
    },
  }), [colors])

  const childArray = React.Children.toArray(children)

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.card}>
        {childArray.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </React.Fragment>
        ))}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
}
