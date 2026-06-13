import React, { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { useUnits } from '../styles/UnitsProvider'
import { formatEnergy } from '../utils/units'

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
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.itemCard, borderRadius: 14, padding: 14, marginBottom: 10,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: colors.kcalText, marginBottom: 2 },
    meta: { fontSize: 13, color: colors.monthText },
    remove: { paddingHorizontal: 8, paddingVertical: 4 },
    removeText: { fontSize: 18, color: colors.monthText },
  }), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Extra meals</Text>
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals in this period — tap ＋ to add one.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {extras.map((e) => {
            const { day, month } = formatDay(e.date)
            return (
              <View key={e.id} testID="extra-item" style={styles.card}>
                <TouchableOpacity testID="open-extra" style={styles.info} onPress={() => onOpenExtra?.(e.id)}>
                  <Text style={styles.name}>{e.name}</Text>
                  <Text style={styles.meta}>{day} {month} · {formatEnergy(e.kcal, units)}</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
