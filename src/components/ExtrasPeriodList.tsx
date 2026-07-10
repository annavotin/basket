import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'
import ItemRow from './ItemRow'
import SwipeRow from './SwipeRow'
import PeriodHeader from './PeriodHeader'

type Props = {
  extras: ExtraMeal[]
  onOpenExtra?: (id: string) => void
  onDeleteExtra?: (id: string) => void
}

export default function ExtrasPeriodList({ extras, onOpenExtra, onDeleteExtra }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32,
    },
    empty: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mossFaint, marginTop: 8 },
  }), [colors])

  const totalKcal = extras.reduce((sum, e) => sum + e.kcal, 0)

  return (
    <View style={styles.container}>
      <PeriodHeader title="Extra meals" count={extras.length} kcal={totalKcal} />
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals in this period. Tap ＋ to add one.</Text>
      ) : (
        <View>
          {extras.map((e) => {
            const { day, month } = formatDay(e.date)
            const row = (
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
            )
            return (
              <View key={e.id} testID="extra-item">
                {onDeleteExtra ? (
                  <SwipeRow onDelete={() => onDeleteExtra(e.id)} deleteTestID="delete-extra">
                    {row}
                  </SwipeRow>
                ) : (
                  row
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
