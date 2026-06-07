import React from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle, PantryItem } from '../types'
import { pantryGramsForCycle, kcalForWeight } from '../utils/nutrition'
import { colors } from '../styles/colors'

type Props = {
  activeCycle: MealPrepCycle | null
  onRemoveItem?: (index: number) => void
  onEditItem?: (index: number) => void
  pantry?: PantryItem[]
  cycleDays?: number
  onSetPantryGrams?: (id: string, grams: number) => void
}

export default function MealPrepDetail({ activeCycle, onRemoveItem, onEditItem, pantry, cycleDays, onSetPantryGrams }: Props) {
  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeCycle.items.map((item, idx) => (
          <View key={idx} testID="food-item" style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <TouchableOpacity
              testID="edit-item"
              style={styles.info}
              onPress={() => onEditItem?.(idx)}
            >
              <Text style={styles.name}>
                {item.name}
                {(item.quantity ?? 1) > 1 ? `  ×${item.quantity}` : ''}
              </Text>
              <Text style={styles.meta}>
                {item.weightG}g  {item.kcal * (item.quantity ?? 1)}kcal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="remove-item"
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
              style={styles.remove}
              onPress={() => onRemoveItem?.(idx)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {pantry && pantry.length > 0 && (
          <>
            <Text testID="pantry-section" style={styles.sectionHeading}>Pantry</Text>
            {pantry.map((item) => {
              const grams = pantryGramsForCycle(item, activeCycle, cycleDays ?? 1)
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
                  <Text style={styles.meta}>{kcal} kcal</Text>
                </View>
              )
            })}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.monthText,
    marginTop: 8,
    marginBottom: 6,
  },
  gramsInput: {
    width: 56,
    fontSize: 13,
    color: colors.kcalText,
    borderBottomWidth: 1,
    borderBottomColor: colors.monthText,
    marginRight: 6,
    textAlign: 'center',
  },
  container: {
    backgroundColor: colors.detailBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.itemCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  emoji: {
    fontSize: 32,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.kcalText,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: colors.monthText,
  },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeText: {
    fontSize: 16,
    color: colors.monthText,
  },
})
