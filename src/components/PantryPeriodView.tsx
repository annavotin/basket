import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MealPrepCycle, PantryItem } from '../types'
import { pantryGramsForCycle, kcalForWeight } from '../utils/nutrition'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'
import ItemRow from './ItemRow'

type Props = {
  cycle: MealPrepCycle
  pantry: PantryItem[]
  cycleDays: number
  onOpenPantry?: (id: string) => void
}

export default function PantryPeriodView({ cycle, pantry, cycleDays, onOpenPantry }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.detailBackground,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32,
    },
    header: { fontSize: 15, fontWeight: '700', color: colors.kcalText, marginBottom: 12 },
    empty: { fontSize: 14, color: colors.monthText, marginTop: 8 },
  }), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry · {cycleDays} days</Text>
      {pantry.length === 0 ? (
        <Text style={styles.empty}>No pantry staples yet — add them from the Pantry settings.</Text>
      ) : (
        <View>
          {pantry.map((item) => {
            const grams = pantryGramsForCycle(item, cycle, cycleDays)
            const kcal = kcalForWeight(item.kcalPer100g, grams)
            return (
              <View key={item.id} testID="pantry-detail-row">
                <ItemRow
                  testID="open-pantry-item"
                  emoji={item.emoji}
                  name={item.name}
                  subtitle={`${grams} g · ${formatEnergy(kcal, units)}`}
                  kcal={kcal}
                  onPress={() => onOpenPantry?.(item.id)}
                />
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
