import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { colors } from '../styles/colors'

type Props = {
  extras: ExtraMeal[]
  onRemoveExtra: (id: string) => void
}

export default function ExtrasPeriodList({ extras, onRemoveExtra }: Props) {
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
                <View style={styles.info}>
                  <Text style={styles.name}>{e.name}</Text>
                  <Text style={styles.meta}>{day} {month} · {e.kcal} kcal</Text>
                </View>
                <TouchableOpacity
                  testID="remove-extra"
                  accessibilityLabel={`Remove ${e.name}`}
                  style={styles.remove}
                  onPress={() => onRemoveExtra(e.id)}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
})
