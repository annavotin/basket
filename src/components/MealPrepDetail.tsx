import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { colors } from '../styles/colors'

type Props = {
  activeCycle: MealPrepCycle | null
}

export default function MealPrepDetail({ activeCycle }: Props) {
  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeCycle.items.map((item, idx) => (
          <View key={idx} testID="food-item" style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.weightG}g  {item.kcal}kcal</Text>
            </View>
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
})
