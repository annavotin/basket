import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { colors } from '../styles/colors'

type Props = {
  activeCycle: MealPrepCycle | null
  onRemoveItem?: (index: number) => void
}

export default function MealPrepDetail({ activeCycle, onRemoveItem }: Props) {
  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeCycle.items.map((item, idx) => (
          <View key={idx} testID="food-item" style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.name}
                {(item.quantity ?? 1) > 1 ? `  ×${item.quantity}` : ''}
              </Text>
              <Text style={styles.meta}>
                {item.weightG}g  {item.kcal * (item.quantity ?? 1)}kcal
              </Text>
            </View>
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
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
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
