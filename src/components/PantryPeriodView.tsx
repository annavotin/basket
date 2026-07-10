import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MealPrepCycle, PantryItem } from '../types'
import { pantryGramsForCycle, kcalForWeight } from '../utils/nutrition'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import { fonts } from '../styles/fonts'
import ItemRow from './ItemRow'
import SwipeRow from './SwipeRow'
import PeriodHeader from './PeriodHeader'

type Props = {
  cycle: MealPrepCycle
  pantry: PantryItem[]
  cycleDays: number
  onOpenPantry?: (id: string) => void
  onDeletePantry?: (id: string) => void
}

export default function PantryPeriodView({ cycle, pantry, cycleDays, onOpenPantry, onDeletePantry }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32,
    },
    empty: {
      fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mossFaint, marginTop: 8,
    },
  }), [colors])

  const totalKcal = pantry.reduce(
    (sum, item) => sum + kcalForWeight(item.kcalPer100g, pantryGramsForCycle(item, cycle, cycleDays)),
    0
  )

  return (
    <View style={styles.container}>
      <PeriodHeader title="Pantry staples" count={pantry.length} kcal={totalKcal} />
      {pantry.length === 0 ? (
        <Text style={styles.empty}>No pantry staples yet. Add them from the Pantry settings.</Text>
      ) : (
        <View>
          {pantry.map((item) => {
            const grams = pantryGramsForCycle(item, cycle, cycleDays)
            const kcal = kcalForWeight(item.kcalPer100g, grams)
            const row = (
              <ItemRow
                testID="open-pantry-item"
                emoji={item.emoji}
                name={item.name}
                subtitle={`${grams} g · ${formatEnergy(kcal, units)}`}
                kcal={kcal}
                onPress={() => onOpenPantry?.(item.id)}
              />
            )
            return (
              <View key={item.id} testID="pantry-detail-row">
                {onDeletePantry ? (
                  <SwipeRow onDelete={() => onDeletePantry(item.id)} deleteTestID="delete-pantry">
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
