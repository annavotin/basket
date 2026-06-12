import React, { useMemo } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native'
import { MealPrepCycle, PantryItem } from '../types'
import { pantryGramsForCycle, kcalForWeight } from '../utils/nutrition'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'

type Props = {
  cycle: MealPrepCycle
  pantry: PantryItem[]
  cycleDays: number
  onSetPantryGrams?: (id: string, grams: number) => void
}

export default function PantryPeriodView({ cycle, pantry, cycleDays, onSetPantryGrams }: Props) {
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
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.itemCard, borderRadius: 14, padding: 14, marginBottom: 10,
    },
    emoji: { fontSize: 32, marginRight: 14 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginBottom: 2 },
    meta: { fontSize: 13, color: colors.monthText },
    gramsInput: {
      width: 56, fontSize: 13, color: colors.kcalText,
      borderBottomWidth: 1, borderBottomColor: colors.monthText,
      marginRight: 6, textAlign: 'center',
    },
  }), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry · {cycleDays} days</Text>
      {pantry.length === 0 ? (
        <Text style={styles.empty}>No pantry staples yet — add them from the Pantry settings.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {pantry.map((item) => {
            const grams = pantryGramsForCycle(item, cycle, cycleDays)
            const kcal = kcalForWeight(item.kcalPer100g, grams)
            return (
              <View key={item.id} testID="pantry-detail-row" style={styles.card}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={[styles.name, styles.info]}>{item.name}</Text>
                <TextInput
                  testID="pantry-grams"
                  style={styles.gramsInput}
                  value={String(grams)}
                  keyboardType="numeric"
                  onChangeText={(t) => onSetPantryGrams?.(item.id, parseInt(t, 10) || 0)}
                />
                <Text style={styles.meta}>{formatEnergy(kcal, units)}</Text>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
