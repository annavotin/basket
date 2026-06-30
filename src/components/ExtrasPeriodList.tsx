import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'
import ItemRow from './ItemRow'

type Props = {
  extras: ExtraMeal[]
  onOpenExtra?: (id: string) => void
}

export default function ExtrasPeriodList({ extras, onOpenExtra }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32,
    },
    seclbl: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12,
    },
    seclblTitle: { fontFamily: fonts.head, fontWeight: '700', fontSize: 18, color: colors.forest },
    seclblCount: { fontFamily: fonts.display, fontSize: 12, fontWeight: '700', color: colors.moss },
    empty: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mossFaint, marginTop: 8 },
  }), [colors])

  return (
    <View style={styles.container}>
      <View style={styles.seclbl}>
        <Text style={styles.seclblTitle}>Extra meals</Text>
        {extras.length > 0 && (
          <Text style={styles.seclblCount}>{extras.length} {extras.length === 1 ? 'item' : 'items'}</Text>
        )}
      </View>
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals in this period. Tap ＋ to add one.</Text>
      ) : (
        <View>
          {extras.map((e) => {
            const { day, month } = formatDay(e.date)
            return (
              <View key={e.id} testID="extra-item">
                <ItemRow
                  testID="open-extra"
                  emoji="🍴"
                  name={e.name}
                  subtitle={`${day} ${month} · ${formatEnergy(e.kcal, units)}`}
                  kcal={e.kcal}
                  tileColor={colors.extraPillFaint}
                  kcalColor={colors.roseDeep}
                  onPress={() => onOpenExtra?.(e.id)}
                />
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
