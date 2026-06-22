import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
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
      backgroundColor: colors.detailBackground,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, flex: 1,
    },
    header: { fontSize: 15, fontWeight: '700', color: colors.kcalText, marginBottom: 12 },
    empty: { fontSize: 14, color: colors.monthText, marginTop: 8 },
  }), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Extra meals</Text>
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals in this period — tap ＋ to add one.</Text>
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
