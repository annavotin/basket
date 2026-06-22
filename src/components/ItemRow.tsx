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
    card: {
      backgroundColor: colors.itemCard, borderRadius: 18,
      paddingVertical: 11, paddingHorizontal: 13, marginBottom: 9,
      borderWidth: 1, borderColor: colors.line,
    },
    inner: { flexDirection: 'row', alignItems: 'center' },
    av: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sageBg2, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
    avText: { fontSize: 23 },
    tx: { flex: 1 },
    nm: { fontFamily: fonts.head, fontWeight: '500', fontSize: 15.5, color: colors.forest },
    mt: { fontSize: 12, fontWeight: '600', color: colors.mossFaint, marginTop: 1 },
    kc: { alignItems: 'flex-end', marginLeft: 8 },
    kcVal: { fontFamily: fonts.head, fontWeight: '600', fontSize: 15, color: colors.matchaDeep },
    kcUnit: { fontSize: 9, fontWeight: '700', color: colors.mossFaint, marginTop: 1 },
  }), [colors])

  return (
    <View style={styles.card}>
      <TouchableOpacity testID={testID} style={styles.inner} onPress={onPress} activeOpacity={0.7}>
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
    </View>
  )
}
