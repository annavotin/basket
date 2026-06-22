import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatWeight, formatEnergy } from '../utils/units'
import ItemRow from './ItemRow'

type Props = {
  activeCycle: MealPrepCycle | null
  onEditItem?: (index: number) => void
  /** Optional content rendered inside the scroll view, above the item rows. */
  headerContent?: React.ReactNode
}

export default function MealPrepDetail({ activeCycle, onEditItem, headerContent }: Props) {
  const colors = useColors()
  const units = useUnits()

  const styles = useMemo(() => StyleSheet.create({
    container: { paddingHorizontal: 16 },
  }), [colors])

  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: 4 }}>
        {headerContent}
        {activeCycle.items.map((item, idx) => {
          const qty = item.quantity ?? 1
          const total = item.kcal * qty
          return (
            <View key={idx} testID="food-item">
              <ItemRow
                testID="edit-item"
                emoji={item.emoji || '🛒'}
                name={`${item.name}${qty > 1 ? ` ×${qty}` : ''}`}
                subtitle={`${formatWeight(item.weightG, units)} · ${formatEnergy(total, units)}`}
                kcal={total}
                onPress={() => onEditItem?.(idx)}
              />
            </View>
          )
        })}
      </View>
    </View>
  )
}
