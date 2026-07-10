import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { fonts } from '../styles/fonts'

type Props = {
  title: string
  count: number
  kcal: number
}

/** Uniform list-section header used by the Batch, Extras, and Pantry tabs: a title on the
 *  left and a "{count} items · {energy}" meta on the right. Energy is unit-aware (kcal/kJ). */
export default function PeriodHeader({ title, count, kcal }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: { fontFamily: fonts.head, fontWeight: '700', fontSize: 18, color: colors.forest },
    meta: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mossFaint },
  }), [colors])

  const energy = units.energy === 'kJ'
    ? `${Math.round(kcal * 4.184).toLocaleString()} kJ`
    : `${Math.round(kcal).toLocaleString()} kcal`

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>
        {count} item{count !== 1 ? 's' : ''}{kcal > 0 ? ` · ${energy}` : ''}
      </Text>
    </View>
  )
}
