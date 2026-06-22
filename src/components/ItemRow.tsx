import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

type Props = {
  emoji: string
  name: string
  subtitle: string
  kcal: number
  onPress?: () => void
  testID?: string
}

export default function ItemRow({ emoji, name, subtitle, kcal, onPress, testID }: Props) {
  const colors = useColors()
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: 'transparent',
      paddingVertical: 13, paddingHorizontal: 2,
      borderBottomWidth: 1, borderBottomColor: colors.line,
    },
    av: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avText: { fontSize: 23 },
    tx: { flex: 1, minWidth: 0 },
    nm: { fontFamily: fonts.display, fontWeight: '500', fontSize: 15.5, color: colors.forest },
    mt: { fontSize: 12, fontWeight: '600', color: colors.mossFaint, marginTop: 1 },
    kc: { alignItems: 'flex-end', flexShrink: 0 },
    kcVal: { fontFamily: fonts.num, fontWeight: '700', fontSize: 15, color: colors.matchaDeep },
    kcUnit: { fontSize: 9, fontWeight: '700', color: colors.mossFaint, marginTop: 1 },
  }), [colors])

  return (
    <TouchableOpacity testID={testID} style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.av}><Text style={styles.avText}>{emoji || '🛒'}</Text></View>
      <View style={styles.tx}>
        <Text style={styles.nm} numberOfLines={1}>{name}</Text>
        <Text style={styles.mt}>{subtitle}</Text>
      </View>
      <View style={styles.kc}>
        <Text style={styles.kcVal}>{Math.round(kcal)}</Text>
        <Text style={styles.kcUnit}>KCAL</Text>
      </View>
    </TouchableOpacity>
  )
}
