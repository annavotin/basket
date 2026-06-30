import React, { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { ExtraMeal } from '../types'
import { formatDay } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  date: string
  extras: ExtraMeal[]
  onRemoveExtra: (id: string) => void
}

export default function ExtraMealDetail({ date, extras, onRemoveExtra }: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.detailBackground,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, flex: 1,
    },
    seclbl: {
      flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
      paddingTop: 4, paddingBottom: 11,
    },
    seclblTitle: { fontFamily: fonts.head, fontSize: 18, color: colors.forest },
    seclblCount: { fontFamily: fonts.display, fontSize: 12, fontWeight: '700', color: colors.moss },
    empty: { fontSize: 14, color: colors.moss, marginTop: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: 'transparent',
      paddingVertical: 13, paddingHorizontal: 2,
      borderBottomWidth: 1, borderBottomColor: colors.line,
    },
    tile: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: colors.extraPillFaint,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    tileText: { fontSize: 23 },
    tx: { flex: 1, minWidth: 0 },
    name: { fontFamily: fonts.display, fontWeight: '500', fontSize: 15.5, color: colors.forest },
    meta: { fontSize: 12, fontWeight: '600', color: colors.mossFaint, marginTop: 1 },
    kc: { alignItems: 'flex-end', flexShrink: 0 },
    kcVal: { fontFamily: fonts.num, fontWeight: '700', fontSize: 15, color: colors.roseDeep },
    kcUnit: { fontSize: 9, fontWeight: '700', color: colors.mossFaint, marginTop: 1 },
    remove: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      marginLeft: 4,
    },
    removeText: { fontSize: 15, color: colors.mossFaint },
  }), [colors])

  const { day, month } = formatDay(date)

  return (
    <View style={styles.container}>
      <View style={styles.seclbl}>
        <Text style={styles.seclblTitle}>{`Extra meals · ${day} ${month}`}</Text>
        {extras.length > 0 && (
          <Text style={styles.seclblCount}>{extras.length} {extras.length === 1 ? 'item' : 'items'}</Text>
        )}
      </View>
      {extras.length === 0 ? (
        <Text style={styles.empty}>No extra meals yet. Tap ＋ to add one.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {extras.map((e) => (
            <View key={e.id} testID="extra-item" style={styles.row}>
              <View style={styles.tile}>
                <Text style={styles.tileText}>🍴</Text>
              </View>
              <View style={styles.tx}>
                <Text style={styles.name} numberOfLines={1}>{e.name}</Text>
                <Text style={styles.meta}>{e.kcal} kcal</Text>
              </View>
              <View style={styles.kc}>
                <Text style={styles.kcVal}>{Math.round(e.kcal)}</Text>
                <Text style={styles.kcUnit}>KCAL</Text>
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
          ))}
        </ScrollView>
      )}
    </View>
  )
}
