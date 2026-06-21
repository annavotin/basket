import React, { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { MealPrepCycle } from '../types'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { fonts } from '../styles/fonts'
import { formatWeight, formatEnergy } from '../utils/units'

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
    container: { flex: 1, paddingHorizontal: 16 },
    card: {
      backgroundColor: colors.itemCard,
      borderRadius: 18,
      paddingVertical: 11,
      paddingHorizontal: 13,
      marginBottom: 9,
      borderWidth: 1,
      borderColor: colors.line,
    },
    cardInner: { flexDirection: 'row', alignItems: 'center' },
    av: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.sageBg2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    avText: { fontSize: 23 },
    tx: { flex: 1 },
    nm: { fontFamily: fonts.head, fontWeight: '500', fontSize: 15.5, color: colors.forest },
    mt: { fontSize: 12, fontWeight: '600', color: colors.mossFaint, marginTop: 1 },
    kc: { alignItems: 'flex-end', marginLeft: 8 },
    kcVal: { fontFamily: fonts.head, fontWeight: '600', fontSize: 15, color: colors.matchaDeep },
    kcUnit: { fontSize: 9, fontWeight: '700', color: colors.mossFaint, marginTop: 1 },
  }), [colors])

  if (!activeCycle) return null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: 96 }}>
        {headerContent}
        {activeCycle.items.map((item, idx) => {
          const qty = item.quantity ?? 1
          const total = item.kcal * qty
          const [enVal, enUnit] = formatEnergy(total, units).split(' ')
          return (
            <View key={idx} testID="food-item" style={styles.card}>
              <TouchableOpacity
                testID="edit-item"
                style={styles.cardInner}
                onPress={() => onEditItem?.(idx)}
                activeOpacity={0.7}
              >
                <View style={styles.av}>
                  <Text style={styles.avText}>{item.emoji || '🛒'}</Text>
                </View>
                <View style={styles.tx}>
                  <Text style={styles.nm} numberOfLines={1}>
                    {item.name}{qty > 1 ? ` ×${qty}` : ''}
                  </Text>
                  <Text style={styles.mt}>
                    {formatWeight(item.weightG, units)} · {formatEnergy(total, units)}
                  </Text>
                </View>
                <View style={styles.kc}>
                  <Text style={styles.kcVal}>{enVal}</Text>
                  <Text style={styles.kcUnit}>{enUnit.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
